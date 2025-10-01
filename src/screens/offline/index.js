import React, { useEffect, useState } from "react";
import { getAllOffline, removeOffline } from "../../shared/offlineStore";

export default function Offline() {
  const [items, setItems] = useState([]);
  useEffect(() => { getAllOffline().then(setItems); }, []);
  return (
    <div className="screen-container">
      <h2>Saved Offline</h2>
      {items.map(it => (
        <div key={it.id} className="card">
          <div>{it.type}: {it.id}</div>
          <button onClick={async () => {
            await removeOffline(it.id);
            setItems(items.filter(x => x.id !== it.id));
          }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
