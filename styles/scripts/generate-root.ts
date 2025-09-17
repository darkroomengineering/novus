import { colors } from "../colors";
import { easings } from "../easings";
import { customSizes, layout, screens } from "../layout";
import { formatObject, scalingCalc } from "./utils";

export function generateRoot() {
  return `
:root {
  --mobile-width: ${screens.mobile.width};
  --mobile-height: ${screens.mobile.height};
  --desktop-width: ${screens.desktop.width};
  --desktop-height: ${screens.desktop.height};
	--device-width: var(--mobile-width);
	--device-height: var(--mobile-height);
	
	${formatObject(layout, ([name, { mobile }]) => {
    if (name === "columns") return `--columns: ${mobile};`;

    return `--${name}: ${scalingCalc(mobile)};`;
  })}
	
	${formatObject(customSizes, ([name, { mobile }]) => `--${name}: ${scalingCalc(mobile)};`)}

	--layout-width: calc(100vw - (2 * var(--safe)));
	--column-width: calc((var(--layout-width) - (var(--columns) - 1) * var(--gap)) / var(--columns));
	
	${formatObject(easings, ([name, value]) => `--ease-${name}: ${value};`)}
	
	${formatObject(colors, ([name, value]) => `--color-${name}: ${value};`)}
	
	@variant dt {
    --device-width: var(--desktop-width);
    --device-height: var(--desktop-height);

    ${formatObject(
      layout,
      ([name, { desktop }]) => {
        if (name === "columns") return `--columns: ${desktop};`;

        return `--${name}: ${scalingCalc(desktop)};`;
      },
      "\n\t\t"
    )}

    ${formatObject(customSizes, ([name, { desktop }]) => `--${name}: ${scalingCalc(desktop)};`, "\n\t\t")}
	}
}
  `;
}
