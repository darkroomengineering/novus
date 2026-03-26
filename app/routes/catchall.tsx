import { Link } from "~/components/link";
import { Wrapper } from "~/components/wrapper";

export function meta() {
  return [{ title: "404" }];
}

export default function NotFound() {
  return (
    <Wrapper className="items-center justify-center font-mono">
      <h1 className="text-[4rem]">404</h1>
      <p>Page Not Found</p>
      <Link href="/" className="underline">
        Go Home
      </Link>
    </Wrapper>
  );
}
