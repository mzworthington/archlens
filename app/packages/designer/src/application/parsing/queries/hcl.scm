; Vendored from nvim-treesitter queries/hcl/highlights.scm (tree-sitter-hcl grammar).

[
  "!"
  "*"
  "/"
  "%"
  "+"
  "-"
  ">"
  ">="
  "<"
  "<="
  "=="
  "!="
  "&&"
  "||"
] @operator

[
  "{"
  "}"
  "["
  "]"
  "("
  ")"
] @punctuation.bracket

[
  "."
  ".*"
  ","
  "[*]"
] @punctuation.delimiter

[
  (ellipsis)
  "?"
  "=>"
] @punctuation.special

[
  ":"
  "="
] @punctuation.delimiter

[
  "for"
  "endfor"
  "in"
] @keyword

[
  "if"
  "else"
  "endif"
] @keyword

[
  (quoted_template_start)
  (quoted_template_end)
  (template_literal)
] @string

[
  (heredoc_identifier)
  (heredoc_start)
] @punctuation.delimiter

[
  (template_interpolation_start)
  (template_interpolation_end)
  (template_directive_start)
  (template_directive_end)
  (strip_marker)
] @punctuation.special

(numeric_lit) @number

(bool_lit) @constant

(null_lit) @constant

(comment) @comment

(identifier) @variable

(body
  (block
    (identifier) @keyword))

(body
  (block
    (body
      (block
        (identifier) @type))))

(function_call
  (identifier) @function)

(attribute
  (identifier) @property)

(object_elem
  key: (expression
    (variable_expr
      (identifier) @property)))

(expression
  (variable_expr
    (identifier) @variable.builtin)
  (get_attr
    (identifier) @property))
