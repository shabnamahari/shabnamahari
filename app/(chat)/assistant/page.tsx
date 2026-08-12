import { redirect } from "next/navigation";

/**
 * `/assistant` is the address on record for the assistant, so it keeps working.
 *
 * What changed is where the assistant lives. It is no longer a page of its own
 * on a black ground — it floats over the site, so that the thing behind the
 * glass is Shabnam's own homepage rather than a backdrop invented for it. That
 * leaves this route with nothing to render that `/` does not already render
 * better, and rendering the homepage a second time underneath a second copy of
 * the panel would be the wrong way to keep a URL alive.
 *
 * So it forwards, and asks for the panel to be open on arrival.
 */
export default function AssistantPage() {
  redirect("/?ask=1");
}
