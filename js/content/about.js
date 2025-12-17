const about = `
Hi there, I'm Maxim! 👋

I am a Software Engineer with <b>7+ years</b> of experience building high-performance, reliable, and maintainable systems.

I specialize in <b>backend</b> development with <b>Rust</b>, <b>Go</b> and <b>C#</b>, and also have frontend experience using Blazor, Angular, and Vue.

I’ve <b>worked</b> on server-side services, web platforms, and desktop applications. I’ve <b>designed</b> high-load architectures, database schemas, and real-time piplines. I’ve <b>led</b> features from concept to release, participated in planning, code reviews, and mentoring.

Outside of work, I spend time on Linux systems and retro gaming projects, especially emulation, open-source software, and classic hardware.
`;

export function renderAbout(root) {
  root.innerHTML = `<pre>${about}</pre>`;
}
