"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeHtmlParserConfig = exports.defaultTranslators = exports.defaultOptions = exports.contentlessElements = exports.defaultIgnoreElements = exports.defaultBlockElements = void 0;
const utilities_1 = require("./utilities");
const translator_1 = require("./translator");
/* ****************************************************************************************************************** */
// region: Elements
/* ****************************************************************************************************************** */
exports.defaultBlockElements = [
    'ADDRESS', 'ARTICLE', 'ASIDE', 'AUDIO', 'BLOCKQUOTE', 'BODY', 'CANVAS', 'CENTER', 'DD', 'DIR', 'DIV', 'DL',
    'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'FRAMESET', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'HEADER', 'HGROUP', 'HR', 'HTML', 'ISINDEX', 'LI', 'MAIN', 'MENU', 'NAV', 'NOFRAMES', 'NOSCRIPT', 'OL',
    'OUTPUT', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TR', 'UL'
];
exports.defaultIgnoreElements = [
    'AREA', 'BASE', 'COL', 'COMMAND', 'EMBED', 'HEAD', 'INPUT', 'KEYGEN', 'LINK', 'META', 'PARAM', 'SCRIPT',
    'SOURCE', 'STYLE', 'TRACK', 'WBR'
];
exports.contentlessElements = ['BR', 'HR', 'IMG'];
// endregion
/* ****************************************************************************************************************** */
// region: Options
/* ****************************************************************************************************************** */
exports.defaultOptions = Object.freeze({
    preferNativeParser: false,
    codeFence: '```',
    bulletMarker: '*',
    indent: '  ',
    codeBlockStyle: 'fenced',
    emDelimiter: '_',
    strongDelimiter: '**',
    maxConsecutiveNewlines: 3,
    /**
     * Character:               Affects:                       Example:
     *
     *     \                      Escaping                        \-
     *     `                      Code                            `` code ``,  ```lang\n code block \n```
     *     *                      Bullet & Separators             * item,  ***
     *     _                      Bold, Italics, Separator        _italic_,  __bold__,  ^___
     *     ~                      Strikethrough, Code             ~~strike~~,  ~~~lang\n code block \n~~~
     *     [                      Url                             [caption](url)
     *     ]                      Url                             [caption](url)
     */
    globalEscape: [/[\\`*_~\[\]]/gm, '\\$&'],
    /**
     * Note:  The following compiled pattern was selected after perf testing various alternatives.
     *        Please be mindful of performance if updating/changing it.
     *
     * Sequence:                Affects:                        Example:
     *
     *    +(space)                Bullets                         + item
     *    =                       Heading                         heading\n====
     *    #{1,6}(space)           Heading                         ## Heading
     *    >                       Blockquote                      > quote
     *    -                       Bullet, Header, Separator       - item, heading\n---, ---
     *    \d+\.(space)            Numbered list item              1. Item
     */
    lineStartEscape: [
        /^(\s*?)((?:\+\s)|(?:[=>-])|(?:#{1,6}\s))|(?:(\d+)(\.\s))/gm,
        '$1$3\\$2$4'
    ]
});
// endregion
/* ****************************************************************************************************************** */
// region: Translators
/* ****************************************************************************************************************** */
exports.defaultTranslators = {
    /* Pre-formatted text */
    'pre': { noEscape: true },
    /* Line break */
    'br': { content: `  \n`, recurse: false },
    /* Horizontal Rule*/
    'hr': { content: '---', recurse: false },
    /* Headings */
    'h1,h2,h3,h4,h5,h6': ({ node }) => ({
        prefix: '#'.repeat(+node.tagName.charAt(1)) + ' '
    }),
    /* Bold / Strong */
    'strong,b': {
        spaceIfRepeatingChar: true,
        postprocess: ({ content, options: { strongDelimiter } }) => utilities_1.isWhiteSpaceOnly(content)
            ? translator_1.PostProcessResult.RemoveNode
            : content.replace(/^[^\S\r\n]*?(\S+.*?)[^\S\r\n]*?$/gm, utilities_1.surround('$1', strongDelimiter))
    },
    /* Strikethrough */
    'del,s,strike': {
        spaceIfRepeatingChar: true,
        postprocess: ({ content }) => utilities_1.isWhiteSpaceOnly(content)
            ? translator_1.PostProcessResult.RemoveNode
            : content.replace(/^[^\S\r\n]*?(\S+.*?)[^\S\r\n]*?$/gm, '~~$1~~')
    },
    /* Italic / Emphasis */
    'em,i': {
        spaceIfRepeatingChar: true,
        postprocess: ({ content, options: { emDelimiter } }) => utilities_1.isWhiteSpaceOnly(content)
            ? translator_1.PostProcessResult.RemoveNode
            : content.replace(/^[^\S\r\n]*?(\S+.*?)[^\S\r\n]*?$/gm, utilities_1.surround('$1', emDelimiter))
    },
    /* Lists (ordered & unordered) */
    'ol,ul': ({ listKind }) => ({
        surroundingNewlines: listKind ? 1 : 2,
    }),
    /* List Item */
    'li': ({ options: { bulletMarker }, indentLevel, listKind, listItemNumber }) => {
        const indentationLevel = +(indentLevel || 0);
        return {
            prefix: '   '.repeat(+(indentLevel || 0)) +
                (((listKind === 'OL') && (listItemNumber !== undefined)) ? `${listItemNumber}. ` : `${bulletMarker} `),
            surroundingNewlines: 1,
            postprocess: ({ content }) => utilities_1.isWhiteSpaceOnly(content)
                ? translator_1.PostProcessResult.RemoveNode
                : content
                    .trim()
                    .replace(/([^\r\n])(?:\r?\n)+/g, `$1  \n${'   '.repeat(indentationLevel)}`)
                    .replace(/(\S+?)[^\S\r\n]+$/gm, '$1  ')
        };
    },
    /* Block Quote */
    'blockquote': {
        postprocess: ({ content }) => utilities_1.trimNewLines(content).replace(/^(>*)[^\S\r\n]?/gm, `>$1 `)
    },
    /* Code (block / inline) */
    'code': ({ node, parent, options: { codeFence, codeBlockStyle } }) => {
        var _a, _b;
        const isCodeBlock = ['PRE', 'WRAPPED-PRE'].includes(parent === null || parent === void 0 ? void 0 : parent.tagName) && parent.childNodes.length < 2;
        /* Handle code (non-block) */
        if (!isCodeBlock)
            return {
                spaceIfRepeatingChar: true,
                noEscape: true,
                postprocess: ({ content }) => {
                    var _a, _b;
                    // Find longest occurring sequence of running backticks and add one more (so content is escaped)
                    const delimiter = '`' + (((_b = (_a = content.match(/`+/g)) === null || _a === void 0 ? void 0 : _a.sort((a, b) => b.length - a.length)) === null || _b === void 0 ? void 0 : _b[0]) || '');
                    const padding = delimiter.length > 1 ? ' ' : '';
                    return utilities_1.surround(utilities_1.surround(content.replace(/(?:\r?\n){2,}/g, `\n`), padding), delimiter);
                }
            };
        /* Handle code block */
        if (codeBlockStyle === 'fenced') {
            const language = ((_b = (_a = node.getAttribute('class')) === null || _a === void 0 ? void 0 : _a.match(/language-(\S+)/)) === null || _b === void 0 ? void 0 : _b[1]) || '';
            return {
                noEscape: true,
                prefix: codeFence + language + '\n',
                postfix: '\n' + codeFence,
            };
        }
        else {
            return {
                noEscape: true,
                postprocess: ({ content }) => content.replace(/^/gm, '    ')
            };
        }
    },
    /* Link */
    'a': ({ node }) => {
        const href = node.getAttribute('href');
        if (!href)
            return {};
        const title = node.getAttribute('title');
        return {
            postprocess: ({ content }) => content.replace(/(?:\r?\n)+/g, ''),
            prefix: '[',
            postfix: `](${href}${title ? ` "${title}"` : ''})`
        };
    },
    /* Image */
    'img': ({ node, options }) => {
        const src = node.getAttribute('src') || '';
        if (!src || (!options.keepDataImages && /^data:/i.test(src)))
            return { ignore: true };
        const alt = node.getAttribute('alt') || '';
        const title = node.getAttribute('title') || '';
        return {
            content: `![${alt}](${src}${title && ` "${title}"`})`,
            recurse: false
        };
    },
};
// endregion
/* ****************************************************************************************************************** */
// region: General
/* ****************************************************************************************************************** */
/**
 * Note: Do not change - values are tuned for performance
 */
exports.nodeHtmlParserConfig = {
    lowerCaseTagName: false,
    comment: false,
    blockTextElements: {
        script: false,
        noscript: false,
        style: false
    }
};
// endregion
//# sourceMappingURL=config.js.map