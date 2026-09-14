export function PassportPreview() {
  return <article className="passport passport-preview" aria-label="Example Purchase Passport preview">
    <div className="passport-notch" aria-hidden="true" />
    <p className="passport-kicker"><span className="verified-mark">✓</span> Verified with Nimiq</p>
    <p className="passport-merchant">Alike Coffee</p>
    <h2>Flat white</h2>
    <div className="passport-price"><strong>1.5 NIM</strong><span>Today</span></div>
    <div className="passport-stamps"><div><span>Loyalty stamps</span><strong aria-label="Three of five visits">● ● ● <i>○ ○</i></strong></div><p>2 more purchases → Free coffee</p></div>
    <p className="preview-caption">Example Purchase Passport</p>
  </article>
}
