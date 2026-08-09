/**
 * Maps tree-sitter highlight capture names to Tailwind classes.
 * @see https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html
 */
const HIGHLIGHT_THEME: Record<string, string> = {
  keyword: 'text-violet-400',
  'keyword.import': 'text-violet-400',
  'keyword.export': 'text-violet-400',
  comment: 'text-slate-500 italic',
  string: 'text-emerald-400',
  number: 'text-amber-300',
  constant: 'text-amber-300',
  'constant.builtin': 'text-amber-300',
  type: 'text-sky-300',
  'type.builtin': 'text-sky-300',
  property: 'text-cyan-200',
  variable: 'text-slate-200',
  'variable.parameter': 'text-orange-300',
  'variable.builtin': 'text-orange-300',
  function: 'text-blue-300',
  'function.method': 'text-blue-300',
  'function.builtin': 'text-blue-300',
  constructor: 'text-sky-300',
  operator: 'text-slate-400',
  punctuation: 'text-slate-500',
  'punctuation.bracket': 'text-slate-500',
  'punctuation.delimiter': 'text-slate-500',
  tag: 'text-rose-300',
  attribute: 'text-cyan-200',
};

export function highlightClassForCapture(captureName: string): string | null {
  if (HIGHLIGHT_THEME[captureName]) {
    return HIGHLIGHT_THEME[captureName];
  }
  const head = captureName.split('.')[0] ?? captureName;
  return HIGHLIGHT_THEME[head] ?? null;
}
