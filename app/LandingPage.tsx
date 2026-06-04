import { Fraunces, Spline_Sans } from "next/font/google";
import Link from "next/link";
import "./landing.css";
import LandingReveal from "./LandingReveal";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--display",
  display: "swap",
});

const splineSans = Spline_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--body",
  display: "swap",
});

export default function LandingPage() {
  return (
    <div className={`${fraunces.variable} ${splineSans.variable}`}>
      <LandingReveal />

      <header>
        <div className="wrap nav">
          <div className="brand">
            <div className="bars">
              <span></span>
              <span></span>
              <span></span>
            </div>
            priori<span style={{ color: "var(--orange)" }}>™</span>
          </div>
          <nav className="nav-links">
            <a href="#problema">El problema</a>
            <a href="#funciones">Funcionalidades</a>
            <a href="#roadmap">Modo Roadmap</a>
            <a href="#equipos">Para quién</a>
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Link href="/login" className="nav-ghost">Ingresar</Link>
            <a href="#demo" className="nav-cta">Solicitar demo</a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <span className="eyebrow">Transparencia estratégica</span>
          <h1>La claridad de <em>priorizar</em> bien.</h1>
          <p className="lead">
            Priori es la plataforma donde los equipos de software deciden en qué trabajar,
            lo planifican por equipos y quarters, y lo sostienen cuando la realidad se mueve.
            Visual, objetivo y compartible.
          </p>
          <div className="hero-cta">
            <a href="#demo" className="btn btn-primary">Solicitar una demostración →</a>
            <Link href="/login" className="btn btn-ghost">Ingresar a Priori</Link>
            <a href="#funciones" className="btn btn-ghost">Ver funcionalidades</a>
          </div>
          <div className="stats">
            <div className="stat reveal">
              <div className="n">4</div>
              <div className="l">modos de trabajo conectados</div>
            </div>
            <div className="stat reveal">
              <div className="n">P0–P3</div>
              <div className="l">matriz de impacto vs esfuerzo</div>
            </div>
            <div className="stat reveal">
              <div className="n">IA</div>
              <div className="l">refinamiento y análisis asistido</div>
            </div>
            <div className="stat reveal">
              <div className="n">0</div>
              <div className="l">planillas y tableros dispersos</div>
            </div>
          </div>
        </div>
      </section>

      <section className="problems" id="problema">
        <div className="wrap">
          <div className="sec-tag">El problema</div>
          <h2 className="sec-title">Priorizar a ojo cuesta caro.</h2>
          <div className="prob-grid">
            <div className="prob reveal">
              <div className="mark">01</div>
              <h3>Decisiones poco transparentes</h3>
              <p>El &quot;por qué&quot; de cada prioridad vive en la cabeza de pocos. Los stakeholders no ven el criterio y la confianza se erosiona.</p>
            </div>
            <div className="prob reveal">
              <div className="mark">02</div>
              <h3>Planificación que envejece</h3>
              <p>Tableros en MIRO o planillas que, al mover una pieza, obligan a reacomodar todo a mano. Costosos de mantener y desactualizados a la semana.</p>
            </div>
            <div className="prob reveal">
              <div className="mark">03</div>
              <h3>Bloqueos invisibles</h3>
              <p>Los proyectos se demoran y nadie tiene registrado por qué. Las dependencias entre equipos aparecen cuando ya es tarde.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="funciones">
        <div className="wrap">
          <div className="feat-head">
            <div className="sec-tag">Funcionalidades</div>
            <h2 className="sec-title">Todo el ciclo de priorización, en un solo lugar.</h2>
            <p className="sec-sub">Desde la decisión de qué hacer hasta el seguimiento de lo que se está haciendo, conectado de punta a punta.</p>
          </div>
          <div className="feat-grid">
            <div className="card reveal">
              <div className="ic c-orange">S</div>
              <h3>Modo Squad</h3>
              <p>Clasificá proyectos en una matriz de Impacto vs Esfuerzo con drag &amp; drop. Cuadrantes automáticos (Quick Win, Gran Proyecto, Iniciativa Menor, Descartada), indicadores de urgencia por fecha de salida y semáforo de capacidad del equipo.</p>
            </div>
            <div className="card reveal">
              <div className="ic c-blue">C</div>
              <h3>Modo Cross</h3>
              <p>Planificación anual por quarters. Ubicá iniciativas multi-equipo en una línea de tiempo Q1–Q4, gestioná la capacidad por equipo y navegá al detalle de cada squad con un clic.</p>
            </div>
            <div className="card reveal">
              <div className="ic c-green">AI</div>
              <h3>Priori AI</h3>
              <p>Un asistente que conoce el contexto de tu programa. Analizá escenarios por chat y cargá proyectos con una entrevista guiada de pocos pasos. Compatible con Anthropic, OpenAI, Azure, Google y Groq.</p>
            </div>
            <div className="card reveal">
              <div className="ic c-ink">↔</div>
              <h3>Colaboración &amp; trazabilidad</h3>
              <p>Roles (Líder, Analista, Stakeholder), comentarios por proyecto, historial de actividad, invitaciones por email, vistas públicas de solo lectura y exportación a PDF.</p>
            </div>
            <div className="card reveal">
              <div className="ic c-orange">R</div>
              <h3>Modo Roadmap <span className="badge-new">Nuevo</span></h3>
              <p>El reemplazo del tablero de MIRO. Un Gantt por producto donde cada equipo estima su tramo, las barras se encadenan por dependencias y se reacomodan solas. Con detección de sobrecarga de capacidad cruzando todos los productos.</p>
            </div>
            <div className="card reveal">
              <div className="ic c-blue">!</div>
              <h3>Agenda de Desvíos <span className="badge-new">Nuevo</span></h3>
              <p>Registrá por qué un proyecto se demora: fecha del desvío, razón del bloqueo y dependencias involucradas. Una vista consolidada muestra todo lo que está trabado hoy, listo para integrarse con tu gestor de tickets.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="spot" id="roadmap">
        <div className="wrap spot-inner">
          <div className="reveal">
            <div className="sec-tag">Destacado · Modo Roadmap</div>
            <h2 className="sec-title">Un Gantt que se mantiene solo.</h2>
            <p className="sec-sub">Definís duración y dependencias; Priori calcula las posiciones. Si una etapa se corre, todo lo que depende de ella se ajusta automáticamente.</p>
            <ul>
              <li>
                <span className="tick">→</span>
                <div><b>Auto-reflow por dependencias.</b> Movés un tramo y la cadena se reordena sin tocar nada más.</div>
              </li>
              <li>
                <span className="tick">→</span>
                <div><b>Switch manual.</b> ¿Necesitás libertad total? Lo desenganchás y arrastrás como en un tablero clásico.</div>
              </li>
              <li>
                <span className="tick">→</span>
                <div><b>Lectura mes · semana · sprint.</b> Calcula en sprints, se lee en meses. Sin hacer cuentas.</div>
              </li>
              <li>
                <span className="tick">→</span>
                <div><b>Capacidad cross-producto.</b> Te avisa cuando un equipo está pedido por varios productos a la vez.</div>
              </li>
            </ul>
          </div>
          <div className="spot-mock reveal">
            <div className="gantt-head">
              <span>Oct</span><span>Nov</span><span>Dic</span><span>Ene</span>
            </div>
            <div className="gantt-row">
              <div className="team">PDV</div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ left: "4%", width: "18%", background: "var(--orange)" }}>PDV</div>
              </div>
            </div>
            <div className="gantt-row">
              <div className="team">Core</div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ left: "24%", width: "30%", background: "var(--blue)" }}>Core</div>
              </div>
            </div>
            <div className="gantt-row">
              <div className="team">UX</div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ left: "24%", width: "22%", background: "var(--green)" }}>UX Venta</div>
              </div>
            </div>
            <div className="gantt-row">
              <div className="team">BE / FE</div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ left: "4%", width: "64%", background: "var(--ink)" }}>Backend &amp; Frontend</div>
              </div>
            </div>
            <div className="gantt-row">
              <div className="team">Pruebas</div>
              <div className="gantt-track">
                <div className="gantt-bar" style={{ left: "56%", width: "24%", background: "var(--orange)" }}>QA</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="equipos">
        <div className="wrap">
          <div className="sec-tag">Para quién</div>
          <h2 className="sec-title">Una sola fuente de verdad para todo el programa.</h2>
          <div className="aud-grid">
            <div className="aud reveal">
              <div className="role">
                <span style={{ background: "var(--orange)" }}></span>Líderes
              </div>
              <p>Ven el programa completo, los bloqueos activos y la capacidad real de cada equipo. Deciden con criterio visible, no con intuición.</p>
            </div>
            <div className="aud reveal">
              <div className="role">
                <span style={{ background: "var(--blue)" }}></span>Analistas / PMs
              </div>
              <p>Arman la priorización, planifican quarters, registran desvíos y mantienen el roadmap vivo sin pelear con un tablero pesado.</p>
            </div>
            <div className="aud reveal">
              <div className="role">
                <span style={{ background: "var(--green)" }}></span>Stakeholders
              </div>
              <p>Entienden el porqué de cada prioridad y aportan ideas: con &quot;Tengo una idea&quot;, la IA los entrevista y refina su propuesta en minutos.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta" id="demo">
        <div className="wrap">
          <h2>¿Tu equipo se reconoce en estos desafíos?</h2>
          <p>Si gestionás proyectos de software con múltiples stakeholders y querés que la priorización sea transparente, objetiva y compartible, te mostramos cómo funciona.</p>
          <div className="hero-cta" style={{ justifyContent: "center" }}>
            <a href="mailto:[TU_EMAIL]?subject=Quiero conocer Priori" className="btn btn-primary">Solicitar una demostración →</a>
            <a href="[TU_LINKEDIN]" className="btn btn-ghost">Hablar con el equipo</a>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot">
          <div className="brand" style={{ fontSize: "18px" }}>
            <div className="bars">
              <span></span>
              <span></span>
              <span></span>
            </div>
            priori<span style={{ color: "var(--orange)" }}>™</span>
          </div>
          <div>Priorización visual para equipos de software · Argentina · 2026</div>
          <div className="tm">
            Contacto: <a href="mailto:[TU_EMAIL]" style={{ color: "var(--orange)" }}>[TU_EMAIL]</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
