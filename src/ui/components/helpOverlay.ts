export class HelpOverlay {
  private readonly root: HTMLDivElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'help-overlay hidden';
    this.root.innerHTML = `
      <div class="help-overlay__backdrop"></div>
      <div class="help-overlay__panel" role="dialog" aria-modal="true">
        <header>
          <h2>Hilfe & Übersicht</h2>
          <button type="button" class="help-overlay__close" aria-label="Schließen">×</button>
        </header>
        <section>
          <h3>Hotkeys</h3>
          <ul>
            <li><kbd>E</kbd> Cycle vorwärts</li>
            <li><kbd>R</kbd> Soft-Reset</li>
            <li><kbd>N</kbd> Neuer Warcall</li>
            <li><kbd>H</kbd> Hilfe anzeigen</li>
            <li><kbd>P</kbd> Musik abspielen/pausieren</li>
            <li><kbd>M</kbd> Musik stumm schalten</li>
            <li><kbd>[</kbd> Vorheriger Track</li>
            <li><kbd>]</kbd> Nächster Track</li>
          </ul>
        </section>
        <section>
          <h3>Beziehungsarten</h3>
          <ul class="help-overlay__relations">
            <li><span class="dot rival"></span> Rivalität (rot)</li>
            <li><span class="dot ally"></span> Allianz / Freundschaft (blau)</li>
            <li><span class="dot blood"></span> Blutschwur (violett, gepunktet)</li>
            <li><span class="dot hierarchy"></span> Befehlskette (grau)</li>
          </ul>
        </section>
        <section>
          <h3>Tooltips</h3>
          <p>Fokussiere oder hovere Offiziere, um Details, Beziehungen und Schnellaktionen zu sehen.</p>
        </section>
      </div>
    `;
    document.body.appendChild(this.root);
    this.root
      .querySelector('.help-overlay__backdrop')
      ?.addEventListener('click', () => this.close());
    this.root
      .querySelector('.help-overlay__close')
      ?.addEventListener('click', () => this.close());
  }

  open(): void {
    this.root.classList.remove('hidden');
  }

  close(): void {
    this.root.classList.add('hidden');
  }

  toggle(): void {
    if (this.root.classList.contains('hidden')) this.open();
    else this.close();
  }
}
