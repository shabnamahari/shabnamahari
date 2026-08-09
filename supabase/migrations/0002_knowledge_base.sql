-- 0002 — the knowledge base: documents and their chunks
--
-- The whole knowledge base is the website plus a PDF or two. That smallness is
-- the design constraint: retrieval will miss often, so `unanswered` (0004) and
-- the loop back into this table matter more here than in a large-corpus RAG.

create table documents (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null,
  -- Detected from the extracted text, never from a browser locale or a file
  -- name. Used for display and reporting only — retrieval must not filter on
  -- it (see `match_chunks` below).
  lang lang not null,
  source_type document_source_type not null,
  -- Set for `url` documents; the crawler re-fetches this on re-crawl. Unique so
  -- re-crawling a page updates it rather than accumulating duplicates.
  source_url text,
  status document_status not null default 'pending',
  -- Populated when status = 'failed', so the panel can show why without a log dive.
  error text,
  tags text[] not null default '{}',
  -- Raw extracted text, kept so re-chunking with different settings never
  -- requires re-fetching the source.
  raw_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index documents_source_url_key
  on documents (source_url)
  where source_url is not null;

create index documents_status_idx on documents (status);
create index documents_lang_idx on documents (lang);

-- ---------------------------------------------------------------------------

create table chunks (
  id uuid primary key default extensions.gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  content text not null,
  -- Inherited from the parent document rather than re-detected per chunk: a
  -- three-sentence chunk is too short to detect reliably, and a document that
  -- genuinely mixes languages is a content problem to fix at the source.
  lang lang not null,
  -- 1024 to match Cohere embed-v4.0 as configured in `embedding_config`. The
  -- dimension is fixed in the column type, so changing embedding model means
  -- rebuilding this column and its index — `rebuild_embedding_index` below does
  -- that, and the panel warns before calling it.
  embedding extensions.vector(1024),
  token_count integer not null,
  -- Position within the parent document, so a retrieved chunk can be shown with
  -- its neighbours for context.
  chunk_index integer not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  unique (document_id, chunk_index)
);

create index chunks_document_id_idx on chunks (document_id);
create index chunks_lang_idx on chunks (lang);

-- ---------------------------------------------------------------------------
-- Similarity search
--
-- Two things this function deliberately does NOT do:
--
--   1. Filter by language. A question asked in Persian must be able to match an
--      English chunk and vice versa — that is the entire point of choosing a
--      cross-lingual embedding model. `lang` comes back in the result so the
--      citation can be labelled, but it never narrows the search.
--   2. Read from documents that are not `ready`. A half-processed upload has
--      chunks with null embeddings and partial text; those must never reach an
--      answer.
--
-- Distance is cosine (`<=>`), matching the HNSW index's operator class. The
-- index is only used if the ORDER BY expression matches it exactly, so the
-- threshold is applied after ordering rather than as a WHERE clause on the
-- distance.
-- ---------------------------------------------------------------------------

create function match_chunks(
  query_embedding extensions.vector(1024),
  match_count integer default 8,
  similarity_threshold double precision default 0.0
)
returns table (
  id uuid,
  document_id uuid,
  document_title text,
  source_url text,
  content text,
  lang lang,
  chunk_index integer,
  similarity double precision
)
language sql
stable
-- Pinned so the function resolves `vector` and its operators the same way no
-- matter who calls it. Without this a caller with an unexpected search_path
-- gets "operator does not exist: vector <=> vector".
set search_path = public, extensions
as $$
  select
    c.id,
    c.document_id,
    d.title as document_title,
    d.source_url,
    c.content,
    c.lang,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  join documents d on d.id = c.document_id
  where d.status = 'ready'
    and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1)
$$;

-- The threshold is applied by the caller rather than inside the function, so
-- the playground can show what was retrieved *and* rejected. Filtering here
-- would hide exactly the near-misses that diagnose a cross-lingual drop.

-- ---------------------------------------------------------------------------
-- Index rebuild
--
-- Called from the panel when the embedding model changes. Dropping the index
-- before a bulk re-embed and recreating it after is also much faster than
-- updating 1024-dimensional rows against a live HNSW index.
--
-- `m` and `ef_construction` are pgvector's defaults. For a knowledge base of a
-- few thousand chunks they are already generous; raising them costs build time
-- and memory for recall this corpus is too small to need.
-- ---------------------------------------------------------------------------

create function drop_embedding_index()
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  drop index if exists chunks_embedding_hnsw_idx;
end;
$$;

create function create_embedding_index()
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  create index if not exists chunks_embedding_hnsw_idx
    on chunks
    using hnsw (embedding extensions.vector_cosine_ops)
    with (m = 16, ef_construction = 64);
end;
$$;

-- Changing the embedding model changes the column's dimension, which Postgres
-- cannot do while the index exists. This does both, and discards every existing
-- embedding — the caller is responsible for re-embedding afterwards, and the
-- panel states that plainly before it fires.
create function resize_embeddings(new_dimensions integer)
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  if new_dimensions < 1 or new_dimensions > 16000 then
    raise exception 'refusing to resize embeddings to % dimensions', new_dimensions;
  end if;

  perform drop_embedding_index();

  -- Every stored vector is meaningless under a different model, so they are
  -- cleared rather than cast. Leaving them would let stale vectors from the old
  -- model answer queries embedded by the new one.
  execute format(
    'alter table chunks alter column embedding type extensions.vector(%s) using null',
    new_dimensions
  );

  perform create_embedding_index();
end;
$$;

select create_embedding_index();
