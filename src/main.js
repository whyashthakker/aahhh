import './style.css'

const app = document.querySelector('#app')
const route = window.location.pathname.replace(/\/+$/, '') || '/'

if (route === '/punch') {
  const { bootstrapPunchGame } = await import('./games/punch.js')
  bootstrapPunchGame(app)
} else {
  document.title = 'Aahhh Arcade — Tiny games, big feelings'
  app.innerHTML = `
    <main class="arcade-home">
      <header class="arcade-nav">
        <a class="brand" href="/" aria-label="Aahhh Arcade home">
          <span class="brand-mark" aria-hidden="true"><i></i><i></i></span>
          <span>AAHHH<br><b>ARCADE</b></span>
        </a>
        <span>ONE URL · MANY LITTLE ESCAPES</span>
      </header>
      <section class="arcade-hero">
        <p class="eyebrow">WELCOME TO THE ARCADE</p>
        <h1>Small games for<br><em>big feelings.</em></h1>
        <p>Pick a room. Make a little chaos. Leave lighter.</p>
      </section>
      <section class="game-library" aria-label="Games">
        <a class="game-tile punch-tile" href="/punch">
          <span class="game-number">GAME 001</span>
          <div class="mini-dummy" aria-hidden="true"><i></i><b></b><i></i></div>
          <div><h2>Ragdoll Room</h2><p>Add a face. Throw a punch. Let it out.</p></div>
          <strong>PLAY NOW <span>↗</span></strong>
        </a>
        <article class="game-tile coming-soon"><span>GAME 002</span><b>CLASSIFIED</b><small>COMING SOON</small></article>
        <article class="game-tile coming-soon"><span>GAME 003</span><b>CLASSIFIED</b><small>COMING SOON</small></article>
      </section>
    </main>
  `
}
