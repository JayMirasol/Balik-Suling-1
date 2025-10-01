import React from "react";
import { Link } from "react-router-dom";
import ReactPlayer from "react-player"; // Import react-player
import './dashboard.css'; // Add styling for the page

import atinCuPungSingsingImage from "../../screens/feed/home-music-images/atin-cu-pung-singsing.jpg";
import masayangkebaitanImage from "../../screens/feed/home-music-images/Masayang Kebaitan.jpg";
import ocacaImage from "../../screens/feed/home-music-images/O Caca.jpg";
import tuknang from "../../screens/feed/home-music-images/Tuknang.jpeg";
import pupul from "../../screens/feed/home-music-images/Pupul.jpeg";
import abeabe from "../../screens/feed/home-music-images/Abe-Abe.jpg";

import atinCuPungSingsingAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_atin-cu-pung-singsing-kapampangan-folk-song-mapeh-7-youtubemp3free.org.mp3";
import masayangkebaitanAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_masayang-kebaitan-keka-youtubemp3free.org.mp3";
import ocacaAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_o-caca-o-caca-kapampangan-youtubemp3free.org.mp3";
//import tuknangAudio from "../../screens/feed/home-music-audio/tuknang.mp3";
//import pupulAudio from "../../screens/feed/home-music-audio/pupul.mp3";
import abeabeAudio from "../../screens/feed/home-music-audio/ytmp3free.cc_abe-abe-ver-1-youtubemp3free.org.mp3";

const songs = [
  {
    title: "Atin Cu Pung Singsing",
    image: atinCuPungSingsingImage,
    audio: atinCuPungSingsingAudio,
    path: "/chords/atin-cu-pung-singsing",
  },
  {
    title: "Masayang Kebaitan",
    image: masayangkebaitanImage,
    audio: masayangkebaitanAudio,
    path: "/chords/masayang-kebaitan",
  },
  {
    title: "O Caca",
    image: ocacaImage,
    audio: ocacaAudio,
    path: "/chords/o-caca",
  },
  {
    title: "Tuknang",
    image: tuknang,
    //audio: tuknangAudio,
    path: "/chords/tuknang",
  },
  {
    title: "Pupul",
    image: pupul,
    //audio: pupulAudio,
    path: "/chords/pupul",
  },
  {
    title: "Abe-Abe",
    image: abeabe,
    audio: abeabeAudio,
    path: "/chords/abe-abe",
  },
];

export default function Dashboard() {
  return (
    <div className="dashboard-container">
      <div className="dashboard-song-list">
        {songs.map((song, index) => (
          <div key={index} className="dashboard-song-card">
            <Link to={song.path} className="dashboard-song-link">
              <img src={song.image} alt={song.title} className="dashboard-song-image" />
              <div className="dashboard-song-title">{song.title}</div>
              <div className="dashboard-song-details">View Details</div>
            </Link>

            {/* ReactPlayer for playing audio */}
            <div className="dashboard-audio-player">
              <ReactPlayer 
                url={song.audio}
                controls
                width="100%"
                height="50px"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
