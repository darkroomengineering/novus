import { AnimatePresence } from "motion/react";
import { Fragment } from "react";
import { useLocation, useOutlet } from "react-router";

export function AnimatePresenceOutlet() {
  const outlet = useOutlet();
  const location = useLocation();
  // useTransitionFOUCFix();

  return (
    <AnimatePresence>
      <Fragment key={location.pathname}>{outlet}</Fragment>
    </AnimatePresence>
  );
}

// const cssFilesSet = new Set<string>();

// function useTransitionFOUCFix() {
//   useEffect(() => {
//     const observer = new MutationObserver((mutations) => {
//       for (const mutation of mutations) {
//         for (const node of mutation.removedNodes) {
//           if (node instanceof HTMLLinkElement && node.rel === "stylesheet") {
//             const link = document.createElement("link");
//             link.rel = "stylesheet";
//             link.href = node.href;
//             cssFilesSet.add(node.href);
//             document.head.appendChild(link);
//           }
//         }
//       }
//     });

//     observer.observe(document.head, {
//       childList: true,
//       subtree: true,
//     });

//     // Initial stylesheet collection
//     for (const cssFile of document.querySelectorAll<HTMLLinkElement>(
//       'link[rel="stylesheet"]'
//     )) {
//       cssFilesSet.add(cssFile.href);
//       console.log(cssFile.href);
//     }

//     return () => {
//       observer.disconnect();
//       cssFilesSet.clear();
//     };
//   }, []);
// }
