

import Link from "next/link";

function Controller({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 160 100" fill="none" aria-hidden="true"><path d="M48 20h64c17 0 26 15 30 32l8 28c3 15-12 22-22 11l-20-22H52L32 91C22 102 7 95 10 80l8-28c4-17 13-32 30-32Z" fill="currentColor" fillOpacity=".08" stroke="currentColor" strokeWidth="3"/><path d="M43 37v26M30 50h26" stroke="currentColor" strokeWidth="5" strokeLinecap="round"/><circle cx="116" cy="40" r="4" fill="currentColor"/><circle cx="128" cy="51" r="4" fill="currentColor"/><circle cx="104" cy="51" r="4" fill="currentColor"/><circle cx="116" cy="63" r="4" fill="currentColor"/><path d="m69 49 7-3m10 0 7 3M80 20V6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>;
}

function Trophy() {
  return <svg className="trophy" viewBox="0 0 240 280" fill="none" aria-hidden="true"><defs><linearGradient id="cup" x1="55" y1="30" x2="190" y2="240" gradientUnits="userSpaceOnUse"><stop stopColor="#fff5ca"/><stop offset=".35" stopColor="#edc36e"/><stop offset=".65" stopColor="#a76c26"/><stop offset="1" stopColor="#ffe5a0"/></linearGradient></defs><path d="M68 58H30v30c0 40 25 57 57 59M172 58h38v30c0 40-25 57-57 59" stroke="url(#cup)" strokeWidth="12"/><path d="M62 30h116l-9 78c-4 37-24 56-49 56s-45-19-49-56L62 30Z" fill="url(#cup)"/><path d="M77 40h16l10 101c-17-10-22-35-26-101Z" fill="#fff7d7" fillOpacity=".35"/><path d="M111 159h18v51l29 17H82l29-17v-51Z" fill="url(#cup)"/><path d="M78 226h84l8 23H70l8-23Z" fill="url(#cup)"/><path d="M66 250h108v16H66z" fill="#2c3044" stroke="#bf9858"/><path d="m120 66 7 14 16 2-12 12 3 16-14-8-14 8 3-16-12-12 16-2 7-14Z" fill="#825222" fillOpacity=".65"/></svg>;
}

export default function Home() {
  return (
    <div className="site-shell">
      <header className="header">
        <a href="#inicio" className="brand" aria-label="Futebol Competitivo — início"><span className="brand-mark">FC<span>✦</span></span><span>FUTEBOL<strong>COMPETITIVO</strong></span></a>
        <nav aria-label="Navegação principal"><a href="#jogos">Os jogos</a><a href="#como-funciona">Como funciona</a></nav>
        <Link className="header-cta" href="/campeonatos">Acessar arena <span aria-hidden="true">↗</span></Link>
      </header>

      <main id="inicio">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-grid" aria-hidden="true" />
          <div className="hero-heading"><p className="eyebrow"><span className="status-dot" /> FUTEBOL VIRTUAL. RIVALIDADE REAL.</p><h1 id="hero-title">SEU JOGO.<br /><span>SUA PRÓXIMA <em>GLÓRIA.</em></span></h1><p className="hero-description">O ponto de encontro de quem joga <strong>PES e FIFA.</strong><br />Reúna a galera, crie seu campeonato e leve a rivalidade para o controle.</p></div>

          <div className="match-stage" aria-label="PES e FIFA: duas paixões pelo futebol virtual">
            <div className="game-side pes-side"><span className="player-label">PLAYER 01 <i /></span><div className="game-word">PES<span>PRO EVOLUTION SOCCER</span></div><Controller className="controller" /><span className="game-side-note">A CLÁSSICA ARTE DE JOGAR.</span></div>
            <div className="trophy-stage"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="trophy-star">✦</span><Trophy /><div className="trophy-base" /><span className="trophy-label">A DISPUTA É NOSSA.</span></div>
            <div className="game-side fifa-side"><span className="player-label"><i /> PLAYER 02</span><div className="game-word">FIFA<span>PAIXÃO EM CADA PARTIDA</span></div><Controller className="controller" /><span className="game-side-note">O PRÓXIMO LANCE É SEU.</span></div>
          </div>

          <div className="goal-wrap"><span className="goal-caption"><span /> PRESSIONE START NA SUA COMPETIÇÃO <span /></span><Link className="goal-button" href="/campeonatos/novo"><span className="goal-net" aria-hidden="true" /><span className="goal-label"><span className="play-icon" aria-hidden="true">▶</span> Criar campeonato <span aria-hidden="true">↗</span></span></Link><span className="goal-floor" aria-hidden="true" /><p>Da resenha entre amigos à disputa pelo título.</p></div>
          <div className="hero-bottom"><span>DO SOFÁ PARA O HALL DA FAMA.</span><a href="#jogos">CONHEÇA A ARENA <span aria-hidden="true">↓</span></a><span>SEU CONTROLE. SUAS REGRAS.</span></div>
        </section>

        <section id="jogos" className="games-section" aria-labelledby="games-title"><div className="section-top"><div><p className="eyebrow">DOIS JOGOS. A MESMA FOME DE VENCER.</p><h2 id="games-title">Escolha seu lado.<br /><span>Reúna seus rivais.</span></h2></div><p>Tem espaço para o toque de bola do PES e para a emoção do FIFA. Aqui, o que conecta os jogadores é a vontade de competir.</p></div>
          <div className="game-cards">
            <article className="game-card pes-card"><div className="card-top"><span>01 / PRO EVOLUTION SOCCER</span><Controller /></div><h3>PES<span>O clássico nunca sai de jogo.</span></h3><p>Chame quem domina o passe, quem vive de contra-ataque e aquele amigo que sempre pede revanche.</p><Link href="/campeonatos/novo?jogo=PES">Criar campeonato <span aria-hidden="true">↗</span></Link><span className="card-watermark" aria-hidden="true">PES</span></article>
            <article className="game-card fifa-card"><div className="card-top"><span>02 / FIFA</span><Controller /></div><h3>FIFA<span>Cada partida, uma nova história.</span></h3><p>Dos dribles improváveis ao gol no último minuto. Reúna os jogadores e dê um título a essa rivalidade.</p><Link href="/campeonatos/novo?jogo=FIFA">Criar campeonato <span aria-hidden="true">↗</span></Link><span className="card-watermark" aria-hidden="true">FIFA</span></article>
          </div>
        </section>

        <section id="como-funciona" className="how-section" aria-labelledby="how-title"><div className="how-heading"><p className="eyebrow">DO LOBBY À GRANDE FINAL</p><h2 id="how-title">A próxima rivalidade<br />começa com você.</h2></div><div className="steps"><article><span>01</span><h3>Escolha o jogo.</h3><p>PES ou FIFA? Defina o palco da sua próxima disputa.</p></article><article><span>02</span><h3>Prepare o campeonato.</h3><p>Dê um nome à competição e escolha o formato.</p></article><article><span>03</span><h3>Convoque a galera.</h3><p>Junte os jogadores. Toda boa rivalidade começa com um convite.</p></article></div></section>
      </main>
      <footer><a href="#inicio" className="footer-brand">FC <span>FUTEBOL COMPETITIVO</span></a><p>Feito para quem leva a resenha e o jogo a sério.</p><a href="#inicio">VOLTAR AO TOPO ↑</a><small>Projeto independente, sem vínculo oficial com as marcas dos jogos.</small></footer>


    </div>
  );
}




