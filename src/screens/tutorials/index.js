export default function Tutorials() {
  // start static; later fetch from Firestore
  const items = [
    { id: 1, title: "Reading Sheet Music (Beginner)", url: "https://www.youtube.com/embed/xxxxx" },
    { id: 2, title: "Balen a Pari (Medly)-kapampangan cover with lyrics and chords", url: "https://www.youtube.com/watch?v=glVKFIiEdiM" },
  ];

  return (
    <div className="screen-container">
      <h2>Tutorials</h2>
      {items.map(v => (
        <div key={v.id} className="card">
          <h3>{v.title}</h3>
          <div className="video-wrap">
            <iframe src={v.url} width="560" height="315" title={v.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
          </div>
        </div>
      ))}
    </div>
  );
}
