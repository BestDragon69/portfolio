export default function NotFound() {
  return (
    <div style={{
      position:'fixed', inset:0,
      background:'linear-gradient(to bottom, #1a1e28 0%, #141820 50%, #3a2a10 100%)',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      fontFamily:'Georgia,serif', color:'#d4b870', textAlign:'center', padding:24,
      userSelect:'none', overflow:'hidden',
    }}>
      {/* Mur de briques — couvre toute la page */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
        {Array.from({length:16}, (_, row) =>
          Array.from({length:13}, (_, col) => (
            <div key={`${row}-${col}`} style={{
              position:'absolute',
              left:`${col * 7.8 + (row % 2) * 3.9}%`,
              top:`${row * 6.5}%`,
              width:'7.2%', height:'5.5%',
              background: row < 8
                ? `hsl(25,${12+(col*3)%10}%,${18+(row*2+col)%8}%)`
                : `hsl(25,${10+(col*2)%8}%,${14+(row+col)%6}%)`,
              border:'1px solid rgba(0,0,0,0.5)',
              boxSizing:'border-box',
            }}/>
          ))
        )}
        {/* Dégradé en bas pour fondu sol */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:'35%',
          background:'linear-gradient(to bottom,transparent,rgba(58,42,16,0.85))',
        }}/>
      </div>

      {/* Chevalier LEGO */}
      <div style={{ position:'relative', zIndex:1, marginBottom:24 }}>
        <img
          src="/chevalier.png"
          alt="Garde chevalier"
          style={{
            height:140,
            imageRendering:'pixelated',
            filter:'drop-shadow(0 8px 24px rgba(0,0,0,0.8))',
          }}
          onError={e => { e.currentTarget.style.display='none'; }}
        />
      </div>

      <div style={{ position:'relative', zIndex:1, maxWidth:480 }}>
        <div style={{
          fontSize:'5rem', fontWeight:700, color:'#c89820',
          textShadow:'0 0 40px rgba(200,150,0,0.6), 0 4px 0 rgba(0,0,0,0.8)',
          marginBottom:8, letterSpacing:6, lineHeight:1,
        }}>404</div>

        <div style={{
          fontSize:'1.3rem', fontWeight:700, marginBottom:14, color:'#f0d890',
          textShadow:'0 2px 8px rgba(0,0,0,0.9)',
        }}>
          Halte ! Cette page n'existe pas.
        </div>

        <div style={{
          background:'rgba(10,8,4,0.7)', border:'1px solid rgba(200,150,32,0.3)',
          borderRadius:10, padding:'14px 20px', marginBottom:24,
        }}>
          <p style={{ fontSize:'0.9rem', lineHeight:1.7, color:'#b09060', margin:0 }}>
            "Je garde ces murs depuis 20 ans et jamais<br/>
            je n'ai laissé passer une URL pareille."
          </p>
          <em style={{ color:'#665040', fontSize:'0.8rem' }}>— Garde numéro 7</em>
        </div>

        <a href="/" style={{
          display:'inline-block',
          background:'linear-gradient(135deg,#8b5e18,#5a3a08)',
          border:'2px solid #c89820', borderRadius:10,
          color:'#ffd700', fontFamily:'Georgia,serif', fontWeight:700,
          fontSize:'0.95rem', padding:'12px 32px',
          textDecoration:'none', letterSpacing:1,
          boxShadow:'0 4px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,100,0.2)',
        }}>
          ⚔️ Retourner au château
        </a>
      </div>
    </div>
  );
}
