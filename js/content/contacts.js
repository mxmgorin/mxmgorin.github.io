export const contacts = {
  en: `
<pre>
Email:
  <a href="mailto:mxmgorin@gmail.com">mxmgorin@gmail.com</a>

GitHub:
  <a href="https://github.com/mxmgorin"
  target = "_blank"
  rel = "noopener noreferrer">github.com/mxmgorin</a>
</pre>
`,
};

export function getContacts() {
  return contacts[en]
}
