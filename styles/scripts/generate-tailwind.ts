import { colors, themes } from "../colors";
import { easings } from "../easings";
import { breakpoints, customSizes } from "../layout";
import { fonts, typography } from "../typography";
import { formatObject, scalingCalc } from "./utils";

export function generateTailwind() {
  // Theme
  const theme = `/** Custom theme **/
@theme {
	--breakpoint-*: initial;
	${formatObject(breakpoints, ([name, value]) => `--breakpoint-${name}: ${value}px;`)}

  --color-*: initial;
	${formatObject(Object.entries(themes)[0][1], ([key, value]) => `--color-${key}: ${value};`)}
  ${formatObject(colors, ([key, value]) => `--color-${key}: ${value};`)}
    
  --spacing-*: initial;
	--spacing-0: 0;
	--spacing-safe: var(--safe);
	--spacing-gap: var(--gap);
  ${formatObject(customSizes, ([key]) => `--spacing-${key}: var(--${key});`)}

  --font-*: initial;
  ${formatObject(fonts, ([name, font]) => `--font-${name}: "${font.name}";`)}

  --ease-*: initial;
  ${formatObject(easings, ([name, value]) => `--ease-${name}: ${value};`)}
}`;

  // Theme overwrites
  const themeOverwrites = `
/** Custom theme overwrites **/
${formatObject(
  themes,
  ([name, values]) => `[data-theme=${name}] {
  ${formatObject(values, ([color, value]) => `--color-${color}: ${value};`)}
}`,
  "\n"
)}
  `;

  // Utilities
  const utilities = `
/** Custom static utilities **/
${Object.entries(typography)
  .map(
    ([name, values]) => `@utility ${name} {
  ${Object.entries(values)
    .filter((entry) => entry?.[0] && entry?.[1])
    .filter((entry) => entry !== undefined)
    .map(([key, value]) => {
      if (key === "font-size") {
        if (typeof value === "number") {
          return `@apply dr-text-${value};`;
        }

        if (typeof value !== "object")
          throw new Error(`Invalid font size: ${value}`);

        return [
          `font-size: ${scalingCalc(value.mobile)};`,
          `@variant dt { font-size: ${scalingCalc(value.desktop)}; }`,
        ].join("\n\t");
      }

      if (typeof value === "object") {
        return [
          `${key}: ${value.mobile};`,
          `@variant dt { ${key}: ${value.desktop}; }`,
        ].join("\n\t");
      }

      return `${key}: ${value};`;
    })
    .join("\n\t")}
}`
  )
  .join("\n")}

@utility desktop-only {
  @media (--mobile) {
    display: none !important;
  }
}

@utility mobile-only {
  @media (--desktop) {
    display: none !important;
  }
}

@utility dr-grid {
	display: grid;
	grid-template-columns: repeat(var(--columns), 1fr);
	column-gap: var(--gap);
}

@utility dr-layout-block {
	margin-inline: auto;
  width: calc(100% - 2 * var(--safe));
}

@utility dr-layout-block-inner {
	padding-inline: var(--safe);
	width: 100%;
}

@utility dr-layout-grid {
	@apply dr-layout-block dr-grid;
}

@utility dr-layout-grid-inner {
	@apply dr-layout-block-inner dr-grid;
}`;

  // Variants
  const variants = `
/** Custom variants **/
${Object.keys(themes)
  .map(
    (name) =>
      `@custom-variant ${name} (&:where([data-theme=${name}], [data-theme=${name} *]));`
  )
  .join("\n")}`;

  return [theme, themeOverwrites, utilities, variants].join("\n");
}
