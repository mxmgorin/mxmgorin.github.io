const about = `
Hi there, I'm Maxim! 👋

Software Engineer with over 7 years of experience, passionate about building high-performance, reliable, and well-crafted software.

I specialize in backend development with Rust, Go and .NET, and also have frontend experience using Blazor, Angular, and Vue.

I’ve worked on server-side services, web solutions, and desktop applications. I’ve designed high-load system architectures, database schemas, and real-time communication between components. I’ve led features from concept to release, participated in planning, code reviews, and mentoring.
`;

export function renderAbout(root) {
  root.innerHTML = `<pre>${about}</pre>`;
}
