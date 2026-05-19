/*!
 * SplitText 3.15.0
 * https://gsap.com
 *
 * @license Copyright 2026, GreenSock. All rights reserved.
 *   Subject to the terms at https://gsap.com/standard-license.
 * @author Jack Doyle
 *
 * TypeScript port for the Darkroom iconic-website project. GSAP runtime
 * coupling stripped (no plugin registration, no `gsap.utils.toArray`, no
 * `gsap.core.context`); the splitting / measuring / wrapping algorithm and
 * DOM behavior are preserved. The lazy `document.fonts` binding that the
 * original assigned inside `register()` is replaced with a module-scope
 * SSR-safe const so font-load auto-split works without registration.
 */

// ---- Public types ---------------------------------------------------------

export type SplitTextTargets =
  | Element
  | string
  | NodeList
  | ArrayLike<Element | string>
  | null
  | undefined;

export interface SplitTextWordDelimiterObject {
  delimiter?: string | RegExp;
  replaceWith?: string;
}

export interface SplitTextAnim {
  totalTime(time?: number): SplitTextAnim | number;
  revert(): void;
}

export interface SplitTextConfig {
  type?: string;
  charsClass?: string;
  wordsClass?: string;
  linesClass?: string;
  tag?: string;
  aria?: "auto" | "hidden" | "none";
  propIndex?: boolean;
  wordDelimiter?: string | RegExp | SplitTextWordDelimiterObject;
  reduceWhiteSpace?: boolean;
  prepareText?: (text: string, element: Element) => string;
  smartWrap?: boolean;
  ignore?: SplitTextTargets;
  specialChars?: string[] | RegExp;
  mask?: "lines" | "words" | "chars";
  autoSplit?: boolean;
  deepSlice?: boolean;
  overwrite?: boolean;
  onSplit?: (self: SplitText) => SplitTextAnim | undefined | void;
  onRevert?: (self: SplitText) => void;
}

// ---- Internal types -------------------------------------------------------

interface SplitTextOrig {
  element: HTMLElement;
  html: string;
  ariaL: string | null;
  ariaH: string | null;
  width?: number;
}

interface SplitTextInternalData {
  orig: SplitTextOrig[];
  obs: ResizeObserver | false;
  anim?: SplitTextAnim;
  animTime?: number;
}

interface WrapperFn {
  (text: string): HTMLElement;
  collection: HTMLElement[];
}

interface ContextLike {
  add(fn: () => void): void;
}

interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

// ---- Module-level state ---------------------------------------------------

const _splitProp: string | symbol = typeof Symbol === "function" ? Symbol() : "_split";

const _charSegmenter: Intl.Segmenter | null =
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter() : null;

// Bound at module scope (was lazily set inside `register()` in the original).
// SSR-safe: `document` is absent during server render.
const _fonts: FontFaceSet | null = typeof document !== "undefined" ? document.fonts : null;

const _emptyArray: readonly never[] = [];

const _emptyBounds: Bounds = { left: 0, top: 0, width: 0, height: 0 };

const _spacesRegEx = /\s+/g;

const _emojiSafeRegEx =
  /\p{RI}\p{RI}|\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?(\u{200D}\p{Emoji}(\p{EMod}|\u{FE0F}\u{20E3}?|[\u{E0020}-\u{E007E}]+\u{E007F})?)*|./gu;

// No-op: the original swapped this for `gsap.core.context` during register()
// so all splits joined a parent gsap context for unified revert. Without it,
// `split()` runs synchronously through `_defaultContext.add()` (see below).
const _context: (instance: SplitText) => void = () => {};

const _defaultContext: ContextLike = { add: (f) => f() };

// Back-reference from element -> SplitText instance (was `el[_splitProp]`).
// Hoisted into helpers so the property-key cast lives in one place.
function getElSplit(el: Element): SplitText | undefined {
  return (el as unknown as Record<string | symbol, SplitText | undefined>)[_splitProp];
}

function setElSplit(el: Element, value: SplitText): void {
  (el as unknown as Record<string | symbol, SplitText | undefined>)[_splitProp] = value;
}

// ---- Helpers --------------------------------------------------------------

function _toArray(r: unknown): unknown[] {
  if (!r) return [];
  if (typeof r === "string") return _toArray(document.querySelectorAll(r));
  if (typeof r === "object" && "length" in (r as object)) {
    return Array.from(r as ArrayLike<unknown>).reduce<unknown[]>((acc, cur) => {
      if (typeof cur === "string") acc.push(..._toArray(cur));
      else acc.push(cur);
      return acc;
    }, []);
  }
  return [r];
}

function _elements(targets: SplitTextTargets): HTMLElement[] {
  return _toArray(targets).filter(
    (e): e is HTMLElement => !!e && typeof e === "object" && (e as Node).nodeType === 1,
  );
}

function _findNextValidBounds(allBounds: Bounds[], startIndex: number): Bounds {
  let idx = startIndex;
  while (++idx < allBounds.length && allBounds[idx] === _emptyBounds) {
    /* keep scanning */
  }
  return allBounds[idx] ?? _emptyBounds;
}

function _revertOriginal({ element, html, ariaL, ariaH }: SplitTextOrig): void {
  element.innerHTML = html;
  if (ariaL) element.setAttribute("aria-label", ariaL);
  else element.removeAttribute("aria-label");
  if (ariaH) element.setAttribute("aria-hidden", ariaH);
  else element.removeAttribute("aria-hidden");
}

function _stretchToFitSpecialChars(
  collection: string[],
  specialCharsRegEx: RegExp | undefined,
): string[] {
  if (!specialCharsRegEx) return collection;
  const charsFound = new Set(collection.join("").match(specialCharsRegEx) ?? _emptyArray);
  if (!charsFound.size) return collection;
  let i = collection.length;
  while (--i > -1) {
    const word = collection[i];
    if (word === undefined) continue;
    for (const char of charsFound) {
      if (char.startsWith(word) && char.length > word.length) {
        let slots = 0;
        let combined = word;
        while (true) {
          slots++;
          combined += collection[i + slots] ?? "";
          if (!char.startsWith(combined) || combined.length >= char.length) {
            break;
          }
        }
        if (slots && combined.length === char.length) {
          collection[i] = char;
          collection.splice(i + 1, slots);
          break;
        }
      }
    }
  }
  return collection;
}

function _disallowInline(element: Element): void {
  if (window.getComputedStyle(element).display === "inline") {
    (element as HTMLElement).style.display = "inline-block";
  }
}

function _insertNodeBefore(newChild: Node | string, parent: Node, existingChild: Node): Node {
  return parent.insertBefore(
    typeof newChild === "string" ? document.createTextNode(newChild) : newChild,
    existingChild,
  );
}

function _getWrapper(
  type: "char" | "word" | "line",
  config: SplitTextConfig,
  collection: HTMLElement[],
): WrapperFn {
  const classKey = `${type}sClass` as "charsClass" | "wordsClass" | "linesClass";
  let className = config[classKey] ?? "";
  const { tag = "div", aria = "auto", propIndex = false } = config;
  const display = type === "line" ? "block" : "inline-block";
  const incrementClass = className.indexOf("++") > -1;
  if (incrementClass) className = className.replace("++", "");
  const wrap = Object.assign(
    (text: string): HTMLElement => {
      const el = document.createElement(tag);
      const i = collection.length + 1;
      if (className) {
        el.className = incrementClass ? `${className} ${className}${i}` : className;
      }
      if (propIndex) el.style.setProperty(`--${type}`, String(i));
      if (aria !== "none") el.setAttribute("aria-hidden", "true");
      if (tag !== "span") {
        el.style.position = "relative";
        el.style.display = display;
      }
      el.textContent = text;
      collection.push(el);
      return el;
    },
    { collection },
  );
  return wrap;
}

function _getLineWrapper(
  element: HTMLElement,
  nodes: ChildNode[],
  config: SplitTextConfig,
  collection: HTMLElement[],
): (startIndex: number, endIndex: number) => void {
  const lineWrapper = _getWrapper("line", config, collection);
  const textAlign = window.getComputedStyle(element).textAlign || "left";
  return (startIndex, endIndex) => {
    const newLine = lineWrapper("");
    newLine.style.textAlign = textAlign;
    const startNode = nodes[startIndex];
    if (!startNode) return;
    element.insertBefore(newLine, startNode);
    for (let i = startIndex; i < endIndex; i++) {
      const n = nodes[i];
      if (n) newLine.appendChild(n);
    }
    newLine.normalize();
  };
}

function _splitWordsAndCharsRecursively(
  element: HTMLElement,
  config: SplitTextConfig,
  wordWrapper: WrapperFn,
  charWrapper: WrapperFn | null,
  prepForCharsOnly: boolean,
  deepSlice: boolean,
  ignore: HTMLElement[] | false,
  charSplitRegEx: RegExp,
  specialCharsRegEx: RegExp | undefined,
  isNested: boolean,
): void {
  const nodes = Array.from(element.childNodes);
  const { wordDelimiter, reduceWhiteSpace = true, prepareText } = config;
  const elementBounds = element.getBoundingClientRect();
  let lastBounds: Bounds | DOMRect = elementBounds;
  const isPreformatted =
    !reduceWhiteSpace && window.getComputedStyle(element).whiteSpace.substring(0, 3) === "pre";
  let ignoredPreviousSibling: Node | 0 = 0;
  const wordsCollection = wordWrapper.collection;

  let wordDelimSplitter: string | RegExp | undefined;
  let wordDelimString: string;
  if (wordDelimiter && typeof wordDelimiter === "object" && !(wordDelimiter instanceof RegExp)) {
    wordDelimSplitter = wordDelimiter.delimiter;
    wordDelimString = wordDelimiter.replaceWith ?? "";
  } else if (wordDelimiter instanceof RegExp) {
    wordDelimSplitter = wordDelimiter;
    wordDelimString = "";
  } else {
    wordDelimString = wordDelimiter === "" ? "" : (wordDelimiter ?? " ");
  }
  const wordDelimIsNotSpace = wordDelimString !== " ";

  for (let i = 0; i < nodes.length; i++) {
    const curNode = nodes[i];
    if (!curNode) continue;
    if (curNode.nodeType === 3) {
      let curTextContent = curNode.textContent ?? "";
      if (reduceWhiteSpace) {
        curTextContent = curTextContent.replace(_spacesRegEx, " ");
      } else if (isPreformatted) {
        curTextContent = curTextContent.replace(/\n/g, wordDelimString + "\n");
      }
      if (prepareText) curTextContent = prepareText(curTextContent, element);
      curNode.textContent = curTextContent;
      const splitter = wordDelimSplitter ?? wordDelimString;
      const words: string[] =
        wordDelimString || wordDelimSplitter
          ? curTextContent.split(splitter as string | RegExp)
          : (curTextContent.match(charSplitRegEx) ?? []);
      const lastWordText = words[words.length - 1];
      const endsWithSpace = wordDelimIsNotSpace
        ? lastWordText !== undefined && lastWordText.slice(-1) === " "
        : !lastWordText;
      if (!lastWordText) words.pop();
      lastBounds = elementBounds;
      const startsWithSpace = wordDelimIsNotSpace
        ? words[0] !== undefined && words[0].charAt(0) === " "
        : !words[0];
      if (startsWithSpace) _insertNodeBefore(" ", element, curNode);
      if (!words[0]) words.shift();
      _stretchToFitSpecialChars(words, specialCharsRegEx);
      if (!(deepSlice && isNested)) curNode.textContent = "";

      for (let j = 1; j <= words.length; j++) {
        let wordText = words[j - 1] ?? "";
        if (!reduceWhiteSpace && isPreformatted && wordText.charAt(0) === "\n") {
          curNode.previousSibling?.remove();
          _insertNodeBefore(document.createElement("br"), element, curNode);
          wordText = wordText.slice(1);
        }
        if (!reduceWhiteSpace && wordText === "") {
          _insertNodeBefore(wordDelimString, element, curNode);
        } else if (wordText === " ") {
          element.insertBefore(document.createTextNode(" "), curNode);
        } else {
          if (wordDelimIsNotSpace && wordText.charAt(0) === " ") {
            _insertNodeBefore(" ", element, curNode);
          }
          let curWordEl: HTMLElement;
          if (
            ignoredPreviousSibling &&
            j === 1 &&
            !startsWithSpace &&
            wordsCollection.indexOf(ignoredPreviousSibling.parentNode as HTMLElement) > -1
          ) {
            const last = wordsCollection[wordsCollection.length - 1];
            if (!last) continue;
            curWordEl = last;
            curWordEl.appendChild(document.createTextNode(charWrapper ? "" : wordText));
          } else {
            curWordEl = wordWrapper(charWrapper ? "" : wordText);
            _insertNodeBefore(curWordEl, element, curNode);
            if (ignoredPreviousSibling && j === 1 && !startsWithSpace) {
              curWordEl.insertBefore(ignoredPreviousSibling, curWordEl.firstChild);
            }
          }
          if (charWrapper) {
            const curWordChars = _charSegmenter
              ? _stretchToFitSpecialChars(
                  [..._charSegmenter.segment(wordText)].map((s) => s.segment),
                  specialCharsRegEx,
                )
              : (wordText.match(charSplitRegEx) ?? []);
            for (let k = 0; k < curWordChars.length; k++) {
              const c = curWordChars[k];
              if (c === undefined) continue;
              curWordEl.appendChild(c === " " ? document.createTextNode(" ") : charWrapper(c));
            }
          }
          if (deepSlice && isNested) {
            curTextContent = curNode.textContent = curTextContent.substring(
              wordText.length + 1,
              curTextContent.length,
            );
            const bounds = curWordEl.getBoundingClientRect();
            if (bounds.top > lastBounds.top && bounds.left <= lastBounds.left) {
              const clonedNode = element.cloneNode() as HTMLElement;
              let curSubNode: ChildNode | null = element.childNodes[0] as ChildNode;
              while (curSubNode && curSubNode !== curWordEl) {
                const tempSubNode = curSubNode;
                curSubNode = curSubNode.nextSibling;
                clonedNode.appendChild(tempSubNode);
              }
              element.parentNode?.insertBefore(clonedNode, element);
              if (prepForCharsOnly) _disallowInline(clonedNode);
            }
            lastBounds = bounds;
          }
          if (j < words.length || endsWithSpace) {
            _insertNodeBefore(
              j >= words.length
                ? " "
                : wordDelimIsNotSpace && wordText.slice(-1) === " "
                  ? " " + wordDelimString
                  : wordDelimString,
              element,
              curNode,
            );
          }
        }
      }
      element.removeChild(curNode);
      ignoredPreviousSibling = 0;
    } else if (curNode.nodeType === 1) {
      const el = curNode as HTMLElement;
      if (ignore && ignore.indexOf(el) > -1) {
        if (
          curNode.previousSibling &&
          wordsCollection.indexOf(curNode.previousSibling as HTMLElement) > -1
        ) {
          const last = wordsCollection[wordsCollection.length - 1];
          last?.appendChild(curNode);
        }
        ignoredPreviousSibling = curNode;
      } else {
        _splitWordsAndCharsRecursively(
          el,
          config,
          wordWrapper,
          charWrapper,
          prepForCharsOnly,
          deepSlice,
          ignore,
          charSplitRegEx,
          specialCharsRegEx,
          true,
        );
        ignoredPreviousSibling = 0;
      }
      if (prepForCharsOnly) _disallowInline(el);
    }
  }
}

// ---- Class ----------------------------------------------------------------

export class SplitText {
  static version = "3.15.0";

  isSplit = false;
  elements: HTMLElement[];
  chars: HTMLElement[] = [];
  words: HTMLElement[] = [];
  lines: HTMLElement[] = [];
  masks: HTMLElement[] = [];
  vars: SplitTextConfig;

  _ctx?: ContextLike;
  _data: SplitTextInternalData;
  _split: () => void;

  constructor(elements: SplitTextTargets, config: SplitTextConfig = {}) {
    this.elements = _elements(elements);
    this.vars = config;
    this.elements.forEach((el) => {
      if (config.overwrite !== false) {
        const existing = getElSplit(el);
        existing?._data.orig.filter(({ element }) => element === el).forEach(_revertOriginal);
      }
      setElSplit(el, this);
    });
    this._split = () => {
      if (this.isSplit) this.split(this.vars);
    };
    const orig: SplitTextOrig[] = [];
    let timerId: ReturnType<typeof setTimeout> | undefined;
    const checkWidths = () => {
      let i = orig.length;
      while (i--) {
        const o = orig[i];
        if (!o) continue;
        const w = o.element.offsetWidth;
        if (w !== o.width) {
          o.width = w;
          this._split();
          return;
        }
      }
    };
    this._data = {
      orig,
      obs:
        typeof ResizeObserver !== "undefined"
          ? new ResizeObserver(() => {
              if (timerId !== undefined) clearTimeout(timerId);
              timerId = setTimeout(checkWidths, 200);
            })
          : false,
    };
    _context(this);
    this.split(config);
  }

  split(config?: SplitTextConfig): this {
    (this._ctx ?? _defaultContext).add(() => {
      if (this.isSplit) this.revert();
      this.vars = config ?? this.vars ?? {};
      const vars = this.vars;
      const {
        type = "chars,words,lines",
        aria = "auto",
        deepSlice = true,
        smartWrap,
        onSplit,
        autoSplit = false,
        specialChars,
        mask,
      } = vars;
      const splitLines = type.indexOf("lines") > -1;
      const splitCharacters = type.indexOf("chars") > -1;
      const splitWords = type.indexOf("words") > -1;
      const onlySplitCharacters = splitCharacters && !splitWords && !splitLines;
      const specialCharsRegEx = specialChars
        ? Array.isArray(specialChars)
          ? new RegExp("(?:" + specialChars.join("|") + ")", "gu")
          : specialChars
        : undefined;
      const finalCharSplitRegEx = specialCharsRegEx
        ? new RegExp(specialCharsRegEx.source + "|" + _emojiSafeRegEx.source, "gu")
        : _emojiSafeRegEx;
      const ignore = !!vars.ignore && _elements(vars.ignore);
      const { orig, animTime, obs } = this._data;

      if (splitCharacters || splitWords || splitLines) {
        this.elements.forEach((element, index) => {
          orig[index] = {
            element,
            html: element.innerHTML,
            ariaL: element.getAttribute("aria-label"),
            ariaH: element.getAttribute("aria-hidden"),
          };
          if (aria === "auto") {
            element.setAttribute("aria-label", (element.textContent ?? "").trim());
          } else if (aria === "hidden") {
            element.setAttribute("aria-hidden", "true");
          }
          const chars: HTMLElement[] = [];
          const words: HTMLElement[] = [];
          const lines: HTMLElement[] = [];
          const charWrapper = splitCharacters ? _getWrapper("char", vars, chars) : null;
          const wordWrapper = _getWrapper("word", vars, words);
          _splitWordsAndCharsRecursively(
            element,
            vars,
            wordWrapper,
            charWrapper,
            onlySplitCharacters,
            deepSlice && (splitLines || onlySplitCharacters),
            ignore,
            finalCharSplitRegEx,
            specialCharsRegEx,
            false,
          );
          if (splitLines) {
            const nodes = Array.from(element.childNodes);
            const wrapLine = _getLineWrapper(element, nodes, vars, lines);
            const toRemove: ChildNode[] = [];
            let lineStartIndex = 0;
            const allBounds: Bounds[] = nodes.map((n) =>
              n.nodeType === 1
                ? ((n as Element).getBoundingClientRect() as unknown as Bounds)
                : _emptyBounds,
            );
            let lastBounds: Bounds = _emptyBounds;
            let i: number;
            for (i = 0; i < nodes.length; i++) {
              const curNode = nodes[i];
              if (!curNode) continue;
              if (curNode.nodeType === 1) {
                if (curNode.nodeName === "BR") {
                  if (!i || nodes[i - 1]?.nodeName !== "BR") {
                    toRemove.push(curNode);
                    wrapLine(lineStartIndex, i + 1);
                  }
                  lineStartIndex = i + 1;
                  lastBounds = _findNextValidBounds(allBounds, i);
                } else {
                  const curBounds = allBounds[i] ?? _emptyBounds;
                  if (
                    i &&
                    curBounds.top > lastBounds.top &&
                    curBounds.left < lastBounds.left + lastBounds.width - 1
                  ) {
                    wrapLine(lineStartIndex, i);
                    lineStartIndex = i;
                  }
                  lastBounds = curBounds;
                }
              }
            }
            if (lineStartIndex < i) wrapLine(lineStartIndex, i);
            toRemove.forEach((el) => {
              el.parentNode?.removeChild(el);
            });
          }
          if (!splitWords) {
            for (let i = 0; i < words.length; i++) {
              const curWord = words[i];
              if (!curWord) continue;
              if (splitCharacters || !curWord.nextSibling || curWord.nextSibling.nodeType !== 3) {
                if (smartWrap && !splitLines) {
                  const smartWrapSpan = document.createElement("span");
                  smartWrapSpan.style.whiteSpace = "nowrap";
                  while (curWord.firstChild) {
                    smartWrapSpan.appendChild(curWord.firstChild);
                  }
                  curWord.replaceWith(smartWrapSpan);
                } else {
                  curWord.replaceWith(...curWord.childNodes);
                }
              } else {
                const nextSibling = curWord.nextSibling;
                if (nextSibling && nextSibling.nodeType === 3) {
                  nextSibling.textContent =
                    (curWord.textContent ?? "") + (nextSibling.textContent ?? "");
                  curWord.remove();
                }
              }
            }
            words.length = 0;
            element.normalize();
          }
          this.lines.push(...lines);
          this.words.push(...words);
          this.chars.push(...chars);
        });
        if (mask && this[mask]) {
          this.masks.push(
            ...this[mask].map((el) => {
              const maskEl = el.cloneNode() as HTMLElement;
              el.replaceWith(maskEl);
              maskEl.appendChild(el);
              if (el.className) {
                maskEl.className = el.className
                  .trim()
                  .split(" ")
                  .map((s) => `${s}-mask`)
                  .join(" ");
              }
              maskEl.style.overflow = "clip";
              return maskEl;
            }),
          );
        }
      }
      this.isSplit = true;
      if (_fonts && splitLines && autoSplit) {
        _fonts.addEventListener("loadingdone", this._split);
      }
      if (onSplit) {
        const onSplitResult = onSplit(this);
        if (onSplitResult && typeof onSplitResult === "object" && "totalTime" in onSplitResult) {
          const anim = onSplitResult as SplitTextAnim;
          this._data.anim =
            animTime !== undefined ? ((anim.totalTime(animTime) as SplitTextAnim) ?? anim) : anim;
        }
      }
      if (splitLines && autoSplit) {
        this.elements.forEach((element, index) => {
          const o = orig[index];
          if (o) o.width = element.offsetWidth;
          if (obs) obs.observe(element);
        });
      }
    });
    return this;
  }

  kill(): void {
    const { obs } = this._data;
    if (obs) obs.disconnect();
    _fonts?.removeEventListener("loadingdone", this._split);
  }

  revert(): this {
    if (this.isSplit) {
      const { orig, anim } = this._data;
      this.kill();
      orig.forEach(_revertOriginal);
      this.chars.length = 0;
      this.words.length = 0;
      this.lines.length = 0;
      this.masks.length = 0;
      orig.length = 0;
      this.isSplit = false;
      if (anim) {
        this._data.animTime = anim.totalTime() as number;
        anim.revert();
      }
      this.vars.onRevert?.(this);
    }
    return this;
  }

  static create(elements: SplitTextTargets, config: SplitTextConfig = {}): SplitText {
    return new SplitText(elements, config);
  }
}

export default SplitText;
