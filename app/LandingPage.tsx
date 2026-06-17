import { Playfair_Display, Spline_Sans } from "next/font/google";
import Link from "next/link";
import "./landing.css";
import LandingReveal from "./LandingReveal";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  style: ["normal", "italic"],
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
    <div className={[playfair.variable, splineSans.variable].join(" ")}>
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
          <h1 className="hero-title">
            La claridad de{" "}
            <span className="accent">priorizar</span>{" "}
            bien.
          </h1>
          <p className="lead">
            Priori es la plataforma donde los equipos ágiles deciden en qué trabajar,
            lo planifican por equipos y quarters, y lo sostienen cuando la realidad se mueve.
            Visual, objetivo y compartible.
          </p>
          <div className="hero-cta">
            <a href="#demo" className="btn btn-primary">Solicitar una demostración →</a>
            <Link href="/login" className="btn btn-ghost">Ingresar a Priori</Link>
          </div>
          <div className="stats">
            <div className="stat reveal">
              <div className="n">3</div>
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

      <section className="product-shot">
        <div className="wrap">
          <div className="product-shot-inner">
            <div className="browser-frame reveal">
              <div className="browser-bar">
                <div className="browser-dot"></div>
                <div className="browser-dot"></div>
                <div className="browser-dot"></div>
                <div className="browser-url">priori.ar/roadmap</div>
              </div>
              <div className="browser-content">
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
                    <div className="gantt-bar" style={{ left: "24%", width: "30%", background: "#4F46E5" }}>Core API</div>
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
                  <div className="team">QA</div>
                  <div className="gantt-track">
                    <div className="gantt-bar" style={{ left: "56%", width: "24%", background: "var(--orange)" }}>QA</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="annot annot-1">Auto-reflow por dependencias</div>
            <div className="annot annot-2">Capacidad en tiempo real</div>
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
              <p>El «por qué» de cada prioridad vive en la cabeza de pocos. Los stakeholders no ven el criterio y la confianza se erosiona.</p>
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

          <div className="frow">
            <div className="ftext reveal">
              <div className="sec-tag">Modo Squad</div>
              <h3>La matriz que ordena el caos.</h3>
              <p>Clasificá proyectos en Impacto vs Esfuerzo con drag &amp; drop. Cuadrantes automáticos, indicadores de urgencia y semáforo de capacidad del equipo.</p>
              <ul>
                <li>Cuadrantes P0–P3 con umbrales configurables</li>
                <li>Canvas visual + vista lista en un clic</li>
                <li>Semáforo de carga por equipo</li>
                <li>Drill-down directo a planificación cross</li>
              </ul>
            </div>
            <div className="fframe reveal">
              <div className="fframe-placeholder">
                <div className="fframe-icon">S</div>
                <span>Captura Modo Squad</span>
              </div>
            </div>
          </div>

          <div className="frow reverse">
            <div className="fframe reveal">
              <div className="fframe-placeholder">
                <div className="fframe-icon">C</div>
                <span>Captura Modo Cross</span>
              </div>
            </div>
            <div className="ftext reveal">
              <div className="sec-tag">Modo Cross</div>
              <h3>Planificación anual, sin hojas de cálculo.</h3>
              <p>Ubicá iniciativas multi-equipo en una línea de tiempo Q1–Q4. Gestioná la capacidad por equipo y navegá al detalle de cada squad con un clic.</p>
              <ul>
                <li>Timeline Q1–Q4 con CSS span automático</li>
                <li>Tabla de capacidad con semáforo</li>
                <li>Asignación de equipos y porcentajes</li>
                <li>Exportación a PDF</li>
              </ul>
            </div>
          </div>

          <div className="frow">
            <div className="ftext reveal">
              <div className="sec-tag">Modo Roadmap</div>
              <h3>Un Gantt que se mantiene solo.</h3>
              <p>Definís duración y dependencias; Priori calcula las posiciones. Si una etapa se corre, todo lo que depende de ella se ajusta automáticamente.</p>
              <ul>
                <li>Auto-reflow por dependencias (Kahn + greedy)</li>
                <li>Switch a modo manual cuando necesitás libertad</li>
                <li>Filtro de grupos, líneas base, desvíos</li>
                <li>Vista pública compartible por link</li>
              </ul>
            </div>
            <div className="fframe reveal">
              <div className="fframe-placeholder">
                <div className="fframe-icon">R</div>
                <span>Captura Modo Roadmap</span>
              </div>
            </div>
          </div>

          <div className="ai-strip reveal">
            <div>
              <div className="sec-tag">Priori AI</div>
              <h3>El asistente que conoce tu programa.</h3>
              <p>Analizá escenarios por chat y cargá proyectos con una entrevista guiada de pocos pasos. Compatible con Anthropic, OpenAI, Azure, Google y Groq.</p>
            </div>
            <a href="#demo" className="btn btn-primary">Ver cómo funciona →</a>
          </div>
        </div>
      </section>

      <section id="equipos">
        <div className="wrap">
          <div className="field">
            <div className="sec-tag">Para quién</div>
            <h2 className="sec-title">Una sola fuente de verdad para todo el programa.</h2>
            <p className="sec-sub">Priori conecta a las personas que deciden con las que ejecutan, sin fricciones.</p>
            <div className="aud-grid">
              <div className="aud reveal">
                <div className="role">
                  <span style={{ background: "#F4C026" }}></span>Líderes
                </div>
                <p>Ven el programa completo, los bloqueos activos y la capacidad real de cada equipo. Deciden con criterio visible, no con intuición.</p>
              </div>
              <div className="aud reveal">
                <div className="role">
                  <span style={{ background: "rgba(255,255,255,.6)" }}></span>Analistas / PMs
                </div>
                <p>Arman la priorización, planifican quarters, registran desvíos y mantienen el roadmap vivo sin pelear con un tablero pesado.</p>
              </div>
              <div className="aud reveal">
                <div className="role">
                  <span style={{ background: "var(--green)" }}></span>Stakeholders
                </div>
                <p>Entienden el porqué de cada prioridad y aportan ideas: con «Tengo una idea», la IA los entrevista y refina su propuesta en minutos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta" id="demo">
        <div className="wrap">
          <h2>¿Tu equipo se reconoce en estos desafíos?</h2>
          <p>Si gestionás proyectos de software con múltiples stakeholders y querés que la priorización sea transparente, objetiva y compartible, te mostramos cómo funciona.</p>
          <div className="hero-cta">
            <a
              href="mailto:vf.godoy8@gmail.com?subject=Quiero conocer Priori"
              className="btn btn-primary"
            >
              Solicitar una demostración →
            </a>
            <Link href="/login" className="btn btn-ghost">Ingresar a Priori</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div className="foot-inner">
            <div className="foot-brand">
              <div className="brand">
                <div className="bars">
                  <span></span><span></span><span></span>
                </div>
                priori<span style={{ color: "#93BFEF" }}>™</span>
              </div>
              <p>Transparencia estratégica para equipos ágiles. Argentina, 2026.</p>
            </div>
            <div className="foot-col">
              <h4>Producto</h4>
              <a href="#funciones">Funcionalidades</a>
              <a href="#problema">El problema</a>
              <a href="#equipos">Para quién</a>
            </div>
            <div className="foot-col">
              <h4>Modos</h4>
              <a href="#funciones">Modo Squad</a>
              <a href="#funciones">Modo Cross</a>
              <a href="#funciones">Modo Roadmap</a>
            </div>
            <div className="foot-col">
              <h4>Contacto</h4>
              <a href="mailto:vf.godoy8@gmail.com">vf.godoy8@gmail.com</a>
              <a href="#demo">Solicitar demo</a>
            </div>
          </div>
          <div className="foot-bottom">
            <span>priori™ · Argentina · 2026</span>
            <Link href="/login">Ingresar</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
