import { state, DEFAULT_LANG } from "../app.js";

const text = {
  en: `
Hi there, I'm Maxim!

I am a Software Engineer with <b>7+ years</b> of experience building high-performance, reliable, and maintainable systems.

I specialize in <b>backend</b> development with <b>Rust</b>, <b>Go</b>, and <b>C#</b>, and also have frontend experience using Blazor, Angular, and Vue.

I’ve <b>worked</b> on server-side services, web platforms, and desktop applications. I’ve <b>designed</b> high-load architectures, database schemas, and real-time pipelines. I’ve <b>led</b> features from concept to release and participated in planning, code reviews, and mentoring.

Outside of work, I spend time on Linux systems and retro gaming projects, especially emulation, open-source software, and classic hardware.
`,

  ru: `
Привет! Меня зовут Максим.

Я разработчик с <b>более чем 7-летним</b> опытом разработки производительных, надёжных и поддерживаемых систем.

Моя основная специализация — <b>backend</b>-разработка на <b>Rust</b>, <b>Go</b> и <b>C#</b>. Также у меня есть опыт frontend-разработки с использованием Blazor, Angular и Vue.

Я работал над серверными сервисами, веб-платформами и десктоп приложениями. Проектировал высоконагруженные системы, схемы баз данных. Вёл проекты от идеи до релиза, участвовал в планировании, код-ревью и менторстве.

В свободное время итересуюсь Linux-экосистемой и open-source проектами, связанными с ретро-геймингом и эмуляцией.
`,
};

export function renderAbout(root) {
  const v = text[state.lang] ?? DEFAULT_LANG;
  root.innerHTML = `<pre>${v}</pre>`;
}
