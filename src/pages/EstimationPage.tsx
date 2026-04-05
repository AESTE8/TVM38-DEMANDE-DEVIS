import { useEffect, useRef, useState } from 'react';

/* ─── Types ─────────────────────────────────────────────── */
type ModalView = 'form' | 'success';

const RATING_LABELS: Record<number, string> = {
  1: 'Très insatisfait',
  2: 'Insatisfait',
  3: 'Neutre',
  4: 'Satisfait',
  5: 'Très satisfait',
};

const GOOGLE_URL = 'https://share.google/0ZlR5lS2znXTftMKB';

function buildStars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

/* ─── Modal Contact ──────────────────────────────────────── */
function ContactModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Fermer avec Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div
      className={`est-modal-overlay${open ? ' active' : ''}`}
      id="contactModalOverlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="est-modal">
        <button className="est-modal-close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="est-contact-info">
          <span className="est-role">Responsable carrière</span>
          <span className="est-manager">Maxime ROMANET</span>
          <div style={{ marginTop: 30 }}>
            <a href="mailto:tvm38@midali.fr" className="est-contact-link">
              <span>✉️</span> tvm38@midali.fr
            </a>
            <a href="tel:0476456865" className="est-contact-link">
              <span>📞</span> 04 76 45 68 65
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Avis ─────────────────────────────────────────── */
function ReviewModal({
  open,
  rating,
  onClose,
}: {
  open: boolean;
  rating: number;
  onClose: () => void;
}) {
  const [view, setView] = useState<ModalView>('form');
  const formRef = useRef<HTMLFormElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setView('form');
      formRef.current?.reset();
    }
  }, [open, rating]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const btn = btnRef.current!;
    const originalText = btn.textContent ?? '';
    btn.textContent = 'Envoi en cours...';
    btn.disabled = true;

    const data = new FormData(e.currentTarget);
    const object: Record<string, string> = Object.fromEntries(
      [...data.entries()].map(([k, v]) => [k, v.toString()])
    );

    object.access_key = '9006136e-466e-4e94-8c92-8b29e693c28e';
    object.subject = '⚠️ Avis Négatif reçu - TVM38 Estimation';
    object.from_name = 'TVM38 - Votre Site Web';
    if (object['Email de contact']) object.replyto = object['Email de contact'];
    delete object._captcha;
    delete object._honey;
    delete object._subject;

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(object),
      });
      const result = await response.json();
      if (result.success) {
        setView('success');
        setTimeout(onClose, 3200);
      } else {
        alert("Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
      }
    } catch {
      alert('Erreur de connexion. Veuillez vérifier votre réseau.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  };

  return (
    <div
      className={`est-modal-overlay${open ? ' active' : ''}`}
      id="modalOverlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="est-modal" id="modal">
        <button className="est-modal-close" onClick={onClose} aria-label="Fermer">✕</button>

        {/* Vue formulaire */}
        {view === 'form' && (
          <div id="formView">
            <div className="est-modal-rating-display">
              <span
                className="est-modal-stars"
                style={{ color: rating === 0 ? '#d4d4d4' : '#f5a623' }}
              >
                {buildStars(rating)}
              </span>
              <span className="est-modal-rating-text">
                Vous avez cliqué sur {rating} étoile{rating > 1 ? 's' : ''} sur 5
              </span>
            </div>

            <h2 id="modalTitle">Votre retour nous aide</h2>
            <p className="est-modal-subtitle">
              Vous confirmez vouloir nous laisser un avis de{' '}
              <strong>{rating} étoile{rating > 1 ? 's' : ''}</strong> ?<br />
              Dites-nous pourquoi ci-dessous.
            </p>

            <form id="reviewForm" ref={formRef} onSubmit={handleSubmit}>
              <input type="hidden" name="note" value={`${rating}/5`} readOnly />
              <input type="hidden" name="_subject" value="Nouvel avis TVM38 !" />
              <input type="hidden" name="_captcha" value="false" />
              <input type="text" name="_honey" style={{ display: 'none' }} />

              <div className="est-form-group">
                <label htmlFor="est-name">Prénom / Nom</label>
                <input type="text" id="est-name" name="Nom de l'utilisateur" placeholder="Jean Dupont" required />
              </div>
              <div className="est-form-group">
                <label htmlFor="est-email">
                  Email <span style={{ fontWeight: 400, color: '#bbb', textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span>
                </label>
                <input type="email" id="est-email" name="Email de contact" placeholder="jean@exemple.fr" />
              </div>
              <div className="est-form-group">
                <label htmlFor="est-phone">
                  Téléphone <span style={{ fontWeight: 400, color: '#bbb', textTransform: 'none', letterSpacing: 0 }}>(optionnel)</span>
                </label>
                <input type="tel" id="est-phone" name="Numéro de téléphone" placeholder="06 12 34 56 78" pattern="[0-9 \.\-\+\(\)]*" />
              </div>
              <div className="est-form-group">
                <label htmlFor="est-message">Votre message</label>
                <textarea id="est-message" name="Détails de l'avis" placeholder="Décrivez votre expérience..." required />
              </div>
              <button type="submit" className="est-btn-submit" ref={btnRef}>Envoyer mon avis</button>
            </form>
          </div>
        )}

        {/* Vue succès */}
        {view === 'success' && (
          <div id="successView" className="est-success-message">
            <span className="est-success-icon">✅</span>
            <h3>Merci pour votre retour !</h3>
            <p>Votre avis a bien été transmis.<br />Nous en tiendrons compte pour nous améliorer.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────────── */
export default function EstimationPage() {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [rating, setRating] = useState(0);
  useEffect(() => {
    document.title = "Valorisation de matériaux - Estimation";
  }, []);

  const handleRating = (n: number) => {
    if (n >= 4) {
      window.open(GOOGLE_URL, '_blank');
      return;
    }
    setRating(n);
    setReviewOpen(true);
  };

  return (
    <>
      <style>{`
        /* ── Variables ── */
        .est-root {
          --blue:       #2c64a3;
          --blue-dark:  #235084;
          --blue-light: #e9f0f7;
          --text:       #666666;
          --title:      #333333;
          --border:     #e2e2e2;
          --white:      #ffffff;
          --shadow-lg:  0 8px 40px rgba(0,0,0,0.13);
          font-family: 'Open Sans', sans-serif;
          color: var(--text);
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-image: url('/fond_page.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
        }

        /* ── LAYOUT ── */
        .est-page {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 20px;
        }

        .est-card {
          background: var(--white);
          border-radius: 18px;
          box-shadow: var(--shadow-lg);
          padding: 52px 44px;
          max-width: 500px;
          width: 100%;
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
        }
        .est-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--blue), #568ec9);
        }

        /* ── LOGO ── */
        .est-logo-wrap {
          text-align: center;
          margin-bottom: 32px;
          animation: estFadeDown .6s ease both;
        }
        .est-logo-wrap img {
          display: block;
          margin: 0 auto;
          max-height: 90px;
          max-width: 240px;
          object-fit: contain;
        }

        /* ── EN-TÊTE ── */
        .est-header {
          text-align: center;
          margin-bottom: 32px;
          animation: estFadeDown .6s ease .1s both;
        }
        .est-header h1 {
          font-family: 'Montserrat', sans-serif;
          font-size: 26px;
          font-weight: 800;
          color: var(--title);
          letter-spacing: -0.6px;
          margin-bottom: 8px;
        }
        .est-header p {
          font-size: 14px;
          color: var(--text);
          line-height: 1.6;
        }

        .est-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 28px;
          animation: estFadeIn .6s ease .15s both;
        }

        /* ── WIDGET ÉTOILES ── */
        .est-stars-widget {
          display: flex;
          justify-content: center;
          gap: 10px;
          padding: 12px 0;
          animation: estFadeIn .6s ease .2s both;
          direction: rtl;
        }
        .est-star-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          font-size: 48px;
          line-height: 1;
          color: #f5a623;
          transition: transform .15s ease, color .15s ease;
          direction: ltr;
        }
        .est-stars-widget:hover .est-star-btn            { color: #d4d4d4; }
        .est-stars-widget .est-star-btn:hover,
        .est-stars-widget .est-star-btn:hover ~ .est-star-btn { color: #f5a623; }
        .est-star-btn:hover  { transform: scale(1.25); }
        .est-star-btn:active { transform: scale(1.1); }

        /* ── FOOTER ── */
        .est-footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #b0b8c4;
        }
        .est-footer a {
          color: #b0b8c4;
          text-decoration: none;
          transition: color .2s;
        }
        .est-footer a:hover { color: var(--blue); }

        /* ── BOUTON FLOTTANT CARRIÈRE ── */
        .est-btn-valorisation {
          position: fixed;
          bottom: 24px; right: 24px;
          background: #d13239;
          color: #fff !important;
          padding: 12px 20px;
          border-radius: 50px;
          text-decoration: none;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px; font-weight: 700;
          box-shadow: 0 4px 15px rgba(209,50,57,0.3);
          transition: transform .2s, background .2s, box-shadow .2s;
          z-index: 100;
          display: flex; align-items: center; gap: 8px;
        }
        .est-btn-valorisation:hover {
          background: #b52b31;
          transform: translateY(-3px);
          box-shadow: 0 6px 20px rgba(209,50,57,0.4);
        }

        /* ── BOUTON CONTACT ── */
        .est-btn-contact {
          position: fixed;
          bottom: 24px; left: 24px;
          background: var(--blue);
          color: #ffffff !important;
          padding: 14px 24px;
          border-radius: 50px;
          text-decoration: none;
          font-family: 'Montserrat', sans-serif;
          font-size: 13px; font-weight: 800;
          box-shadow: 0 4px 15px rgba(46,163,242,0.3);
          transition: transform .2s, background .2s, box-shadow .2s;
          z-index: 100;
          display: flex; align-items: center; gap: 8px;
          cursor: pointer; border: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .est-btn-contact:hover {
          background: var(--blue-dark);
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(46,163,242,0.4);
        }

        /* ── MODAL ── */
        .est-modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,.65);
          backdrop-filter: blur(8px);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
          opacity: 0; visibility: hidden;
          transition: opacity .3s, visibility .3s;
        }
        .est-modal-overlay.active { opacity: 1; visibility: visible; }

        .est-modal {
          background: #ffffff !important;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25);
          padding: 44px 40px;
          max-width: 480px; width: 100%;
          position: relative;
          border: none;
          transform: translateY(30px) scale(.95);
          transition: transform .4s cubic-bezier(.16,1,.3,1), opacity .4s;
        }
        .est-modal-overlay.active .est-modal { transform: translateY(0) scale(1); }
        .est-modal::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, var(--blue), #568ec9);
          border-radius: 18px 18px 0 0;
        }

        .est-modal-close {
          position: absolute; top: 16px; right: 16px;
          width: 32px; height: 32px;
          border: none; background: var(--border);
          border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; color: var(--text);
          transition: background .2s, color .2s;
        }
        .est-modal-close:hover { background: var(--blue); color: #fff; }

        .est-modal-rating-display { text-align: center; margin-bottom: 20px; }
        .est-modal-stars  { font-size: 30px; display: block; margin-bottom: 5px; }
        .est-modal-rating-text {
          font-family: 'Montserrat', sans-serif;
          font-size: 13px; color: var(--text); font-weight: 500;
        }
        .est-modal h2 {
          font-family: 'Montserrat', sans-serif;
          font-size: 20px; font-weight: 700; color: var(--title);
          text-align: center; margin-bottom: 6px;
        }
        .est-modal-subtitle {
          font-size: 13px; color: var(--text);
          text-align: center; margin-bottom: 26px; line-height: 1.55;
        }

        /* Formulaire */
        .est-form-group { margin-bottom: 16px; }
        .est-form-group label {
          display: block;
          font-family: 'Montserrat', sans-serif;
          font-size: 11px; font-weight: 700; color: var(--title);
          margin-bottom: 6px;
          text-transform: uppercase; letter-spacing: .6px;
        }
        .est-form-group input,
        .est-form-group textarea {
          width: 100%; padding: 12px 16px;
          border: 1.5px solid var(--border); border-radius: 8px;
          font-family: 'Open Sans', sans-serif;
          font-size: 14px; color: var(--title);
          outline: none; background: #fafafa;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .est-form-group input:focus,
        .est-form-group textarea:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(46,163,242,.13);
          background: var(--white);
        }
        .est-form-group textarea { resize: vertical; min-height: 110px; line-height: 1.6; }
        .est-form-group input::placeholder,
        .est-form-group textarea::placeholder { color: #c0c0c0; }

        .est-btn-submit {
          width: 100%; padding: 14px;
          background: var(--blue); color: #fff;
          border: none; border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
          font-size: 14px; font-weight: 700;
          cursor: pointer; letter-spacing: .4px; margin-top: 8px;
          transition: background .2s, transform .15s, box-shadow .2s;
        }
        .est-btn-submit:hover {
          background: var(--blue-dark);
          box-shadow: 0 4px 18px rgba(46,163,242,.35);
          transform: translateY(-1px);
        }
        .est-btn-submit:active { transform: translateY(0); }

        /* Contact modal */
        .est-contact-info { text-align: center; padding: 10px 0; }
        .est-contact-info .est-manager {
          font-size: 18px; color: var(--title); font-weight: 700;
          margin-bottom: 5px; display: block;
        }
        .est-contact-info .est-role {
          font-size: 13px; color: var(--blue); font-weight: 600;
          text-transform: uppercase; letter-spacing: 1px;
          margin-bottom: 25px; display: block;
        }
        .est-contact-link {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; padding: 15px; margin-bottom: 12px;
          background: var(--blue-light); border-radius: 12px;
          color: var(--blue-dark); text-decoration: none; font-weight: 600;
          transition: transform .2s, background .2s;
        }
        .est-contact-link:hover { transform: scale(1.02); background: #dbeefc; }
        .est-contact-link span { font-size: 20px; }

        /* Succès */
        .est-success-message { text-align: center; padding: 24px 0; }
        .est-success-icon {
          font-size: 52px; display: block; margin-bottom: 18px;
          animation: estBounceIn .5s cubic-bezier(.34,1.56,.64,1);
        }
        .est-success-message h3 {
          font-family: 'Montserrat', sans-serif;
          font-size: 20px; font-weight: 700; color: var(--title); margin-bottom: 8px;
        }
        .est-success-message p { font-size: 14px; color: var(--text); line-height: 1.6; }

        /* ── ANIMATIONS ── */
        @keyframes estFadeDown {
          from { opacity: 0; transform: translateY(-14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes estFadeIn {
          from { opacity: 0; } to { opacity: 1; }
        }
        @keyframes estBounceIn {
          from { transform: scale(.5); opacity: 0; }
          to   { transform: scale(1);  opacity: 1; }
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 520px) {
          .est-card   { padding: 36px 22px; }
          .est-modal  { padding: 34px 22px; }
          .est-header h1 { font-size: 22px; }
          .est-btn-valorisation, .est-btn-contact {
            position: fixed;
            left: 16px; right: 16px;
            text-align: center;
            justify-content: center;
            font-size: 14px; padding: 14px;
            width: calc(100% - 32px);
          }
          .est-btn-valorisation { bottom: 16px; }
          .est-btn-contact      { bottom: 72px; }
        }
      `}</style>

      <div className="est-root">
        <main className="est-page">
          <div className="est-card">
            <div className="est-logo-wrap">
              <img src="/logo-tvm38.png" alt="TVM38 Estimation" />
            </div>

            <div className="est-header">
              <h1>Donnez votre avis</h1>
              <p>Votre satisfaction est notre priorité</p>
            </div>

            <div className="est-divider" />

            <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#aaa', fontSize: 13, marginBottom: 16 }}>
              Sélectionnez le nombre d'étoiles que vous souhaitez nous attribuer
            </p>

            {/* Widget étoiles — ordre inversé dans le DOM pour l'effet CSS RTL */}
            <div className="est-stars-widget" role="group" aria-label="Choisissez votre note">
              <button className="est-star-btn" aria-label={`5 étoiles — ${RATING_LABELS[5]}`} onClick={() => handleRating(5)}>★</button>
              <button className="est-star-btn" aria-label={`4 étoiles — ${RATING_LABELS[4]}`} onClick={() => handleRating(4)}>★</button>
              <button className="est-star-btn" aria-label={`3 étoiles — ${RATING_LABELS[3]}`} onClick={() => handleRating(3)}>★</button>
              <button className="est-star-btn" aria-label={`2 étoiles — ${RATING_LABELS[2]}`} onClick={() => handleRating(2)}>★</button>
              <button className="est-star-btn" aria-label={`1 étoile — ${RATING_LABELS[1]}`}  onClick={() => handleRating(1)}>★</button>
            </div>
          </div>
        </main>

        <footer className="est-footer">
          <p>© {new Date().getFullYear()} TVM38 Estimation — Tous droits réservés</p>
        </footer>

        {/* Bouton Carrière */}
        <a
          href="https://midali.fr/valorisation-des-materiaux/"
          className="est-btn-valorisation"
          target="_blank"
          rel="noopener noreferrer"
        >
          Voir la page de la carrière
        </a>

        {/* Bouton Contact */}
        <button className="est-btn-contact" onClick={() => setContactOpen(true)}>
          📞 Nous contacter
        </button>
      </div>

      {/* Modals */}
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <ReviewModal open={reviewOpen} rating={rating} onClose={() => setReviewOpen(false)} />
    </>
  );
}
