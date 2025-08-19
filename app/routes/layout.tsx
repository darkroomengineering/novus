import { Link } from "react-router";
import { AnimationOutlet } from "~/components/animation-outlet";

export default function RootLayout() {
	return (
		<>
		<header>
			<Link to="/">Home</Link>
			<Link to="/about">About</Link>
			<Link to="/other">Other</Link>
		</header>
		<AnimationOutlet />
		</>
	)
}