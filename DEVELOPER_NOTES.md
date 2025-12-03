# Developer Notes - Score Scanner Enhancements

## 🏗️ Architecture Overview

### Component Structure
```
src/screens/scanScore/
├── index.js              # Main component with logic and UI
└── scanScore.css         # Animation and styling definitions
```

### Backend Processing
```
backend/
└── server.js            # Image preprocessing and OMR handling
```

---

## 🔧 Key Technologies

### Frontend
- **React**: Component framework
- **pdf-lib**: PDF manipulation and export
- **axios**: HTTP client for API calls
- **CSS Animations**: GPU-accelerated visual effects

### Backend
- **Sharp**: High-performance image processing
- **Audiveris**: OMR (Optical Music Recognition) engine
- **fast-xml-parser**: MusicXML parsing
- **@tonaljs/tonal**: Chord detection and analysis

---

## 📝 State Management

### React State Variables
```javascript
mode               // "score" | "audio" - Current scanning mode
file               // File object of selected file
objectUrl          // Blob URL for preview
result             // API response with chords
busy               // Boolean - upload in progress
dragOver           // Boolean - drag & drop state
scanProgress       // Number 0-100 - progress percentage
scanStage          // String - current processing stage
isScanning         // Boolean - controls overlay visibility
imageQuality       // Object | null - quality analysis results
```

---

## 🎨 Animation System

### CSS Keyframes (scanScore.css)
1. **scanAnimation**: Moving scan line (2.5s loop)
2. **progressShimmer**: Progress bar shimmer effect (2s loop)
3. **pulse**: Pulsing indicator (1s loop)
4. **fadeInUp**: Chord reveal animation (0.6s)
5. **fadeIn**: General fade in (variable)
6. **glow**: Glowing effects (variable)
7. **cornerPulse**: Corner decorations (2s loop)
8. **gridPulse**: Background grid (variable)

### Staggered Animations
- Chord cells use `animation-delay` based on position
- Formula: `(rowIndex * 4 + columnIndex) * 0.1s`
- Creates cascading reveal effect

---

## 🖼️ Image Preprocessing Pipeline

### Sharp Processing Steps (Backend)
```javascript
sharp(imagePath)
  .resize({                           // 1. Resize
    width: 3300,                      // A4 at 400 DPI
    height: 4677,
    fit: 'inside',
    kernel: 'lanczos3'                // High-quality
  })
  .rotate()                           // 2. Auto-rotate
  .grayscale()                        // 3. Convert to grayscale
  .median(3)                          // 4. Noise reduction
  .normalise({ lower: 1, upper: 99 }) // 5. Contrast normalization
  .linear(1.2, -10)                   // 6. Linear adjustment
  .sharpen({                          // 7. Edge enhancement
    sigma: 1.5,
    m1: 1.0,
    m2: 0.5,
    x1: 2,
    y2: 10,
    y3: 20
  })
  .threshold(128)                     // 8. Binarization
  .tiff({                             // 9. Save as TIFF
    compression: 'lzw',
    quality: 100,
    predictor: 'horizontal'
  })
```

### Why These Steps?
1. **Resize to 400 DPI**: Optimal for Audiveris OMR engine
2. **Auto-rotate**: Corrects EXIF orientation
3. **Grayscale**: Removes color noise, focuses on structure
4. **Median filter**: Removes salt-and-pepper noise
5. **Normalise**: Adaptive contrast enhancement
6. **Linear adjustment**: Fine-tune brightness/contrast
7. **Sharpen**: Enhances staff lines and note heads
8. **Threshold**: Binary-like image for line detection
9. **TIFF**: Lossless format preferred by Audiveris

---

## 🔍 Image Quality Analysis

### Algorithm (Frontend)
```javascript
checkImageQuality(file) {
  1. Load image into Image object
  2. Extract width and height
  3. Calculate pixel count
  4. Estimate DPI: width / 8.27 (A4 width in inches)
  5. Determine quality level:
     - Excellent: ≥300 DPI
     - Acceptable: ≥200 DPI
     - Poor: <200 DPI
  6. Generate feedback message
  7. Return quality object with metrics
}
```

### Limitations
- Assumes A4 paper size (8.27 × 11.69 inches)
- DPI estimation is approximate
- Doesn't check actual image sharpness
- Doesn't detect skew or artifacts

### Potential Improvements
- Calculate actual DPI from EXIF data
- Add blur detection (Laplacian variance)
- Add skew detection (Hough transform)
- Check contrast ratio
- Detect if image is too dark/bright

---

## 📡 Progress Simulation

### Why Simulated?
- Audiveris runs as separate process
- No direct progress reporting available
- Would require WebSocket or polling
- Simulation provides better UX than spinner

### How It Works
```javascript
1. Start at 0%
2. Random increments every 400ms
3. Never exceeds 90% until complete
4. Stage messages change every 2s (score) or 1.5s (audio)
5. On completion, jump to 100%
6. Brief delay before showing results
```

### Future: Real Progress
To implement real progress tracking:
1. Add WebSocket server to backend
2. Emit progress events from Audiveris stdout
3. Parse log messages for stages
4. Update frontend via WebSocket
5. Fall back to simulation if WS fails

---

## 🎯 Event Flow

### File Selection Flow
```
User selects file
  ↓
onFileChange(event) triggered
  ↓
setChosenFile(file) called
  ↓
If image in score mode → checkImageQuality(file)
  ↓
Create objectUrl for preview
  ↓
Update state: file, objectUrl, imageQuality
  ↓
UI updates with preview and quality card
```

### Scanning Flow
```
User clicks Scan button
  ↓
onUpload(event) triggered
  ↓
Set: busy=true, isScanning=true
  ↓
Start progress simulation
  ↓
Start stage updates
  ↓
POST to /omr/scan or /audio/chords
  ↓
Backend processes (Audiveris/audio analysis)
  ↓
Response received
  ↓
Clear intervals, set progress=100%
  ↓
Delay 800ms for effect
  ↓
Set: result, busy=false, isScanning=false
  ↓
UI shows animated results
```

---

## 🐛 Error Handling

### Frontend Errors
- Network timeout: 180s (3 minutes)
- File too large: 50MB limit (backend)
- Unsupported format: Rejected by accept attribute
- Quality check failure: Gracefully fallback to null

### Backend Errors
- Audiveris not found: Clear error message with setup instructions
- Audiveris failed: Exit code and stderr logged
- No MusicXML output: User-friendly message with tips
- Image preprocessing failure: Falls back to original file
- Empty measures: Returns error with guidance

### Error Messages
All errors include:
- Clear description of problem
- Actionable next steps
- Technical details (in console)
- Link to documentation (where applicable)

---

## 🔒 Security Considerations

### File Upload
- Size limit: 50MB prevents abuse
- Type checking: Extension validation
- Temporary storage: Files deleted after processing
- No database storage: Files not persisted
- Sanitized filenames: Special characters removed

### CORS
- Single origin allowed: FRONTEND_ORIGIN env variable
- No wildcards: Specific domain required
- Credentials not allowed: No cookies sent

### Process Spawning
- Timeout: 180s prevents hanging
- Kill signal: SIGKILL on timeout
- Shell: Only for .bat/.cmd files
- Command validation: Path checked for existence

---

## 📊 Performance Metrics

### Image Processing
- **Time**: 2-5 seconds for typical image
- **Memory**: ~100-200MB during processing
- **CPU**: Multi-threaded (Sharp uses libvips)

### OMR Processing
- **Time**: 10-30 seconds for single page
- **Memory**: ~500MB-1GB (Audiveris JVM)
- **CPU**: Single-threaded (Java process)

### Frontend Animations
- **FPS**: 60fps for smooth animations
- **GPU**: All transforms GPU-accelerated
- **Memory**: Minimal (<10MB for animations)

### Optimization Opportunities
1. **Batch Processing**: Multiple pages in single Audiveris run
2. **Worker Threads**: Offload Sharp to separate thread
3. **Caching**: Cache preprocessed images
4. **Progressive Loading**: Show partial results
5. **WebWorkers**: Move quality check to worker

---

## 🧪 Testing Strategy

### Unit Tests Needed
- [ ] Image quality calculation
- [ ] Chord detection logic
- [ ] Progress calculation
- [ ] File type validation
- [ ] DPI estimation accuracy

### Integration Tests Needed
- [ ] End-to-end scanning flow
- [ ] Error handling paths
- [ ] PDF export functionality
- [ ] Multi-page PDF handling
- [ ] Audio mode (ensure unchanged)

### Manual Testing Checklist
- [ ] High-quality image (300+ DPI)
- [ ] Medium-quality image (200-300 DPI)
- [ ] Low-quality image (<200 DPI)
- [ ] PDF file
- [ ] Skewed image
- [ ] Blurry image
- [ ] Drag and drop
- [ ] File input button
- [ ] Animation smoothness
- [ ] Progress updates
- [ ] Result animations
- [ ] Error messages
- [ ] Mobile responsiveness

---

## 🔄 Future Enhancements

### Phase 1 (Near-term)
1. **Real-time Progress**: WebSocket for actual Audiveris progress
2. **Batch Upload**: Multiple files at once
3. **History**: Save scanned scores
4. **Edit Mode**: Manual chord correction
5. **Confidence Scores**: Show detection confidence

### Phase 2 (Medium-term)
1. **Auto-Enhancement**: Client-side preprocessing
2. **Machine Learning**: Train custom chord detection
3. **MIDI Export**: Convert to playable MIDI
4. **Chord Playback**: Audio preview
5. **Transposition**: Change key automatically

### Phase 3 (Long-term)
1. **Mobile App**: Native iOS/Android
2. **Cloud Storage**: Save to Google Drive/Dropbox
3. **Collaboration**: Share and edit with others
4. **Version History**: Track changes over time
5. **Advanced OMR**: Better handwriting support

---

## 📚 Resources

### Documentation
- [Sharp Documentation](https://sharp.pixelplumbing.com/)
- [Audiveris Handbook](https://audiveris.github.io/audiveris/)
- [MusicXML Standard](https://www.w3.org/2021/06/musicxml40/)
- [Tonal.js API](https://github.com/tonaljs/tonal)

### Related Projects
- [OMR-Research](https://github.com/apacha/OMR-Datasets)
- [Optical Music Recognition](https://en.wikipedia.org/wiki/Optical_music_recognition)
- [Music21](http://web.mit.edu/music21/)

---

## 🤝 Contributing Guidelines

### Code Style
- Use ES6+ features
- Prefer functional components
- Use React Hooks
- Comment complex logic
- Keep functions small (<50 lines)
- Extract reusable logic

### Commit Messages
```
feat: Add image quality validation
fix: Resolve animation timing issue
style: Improve scan line animation
docs: Update API documentation
refactor: Extract quality check logic
perf: Optimize Sharp processing
test: Add unit tests for quality check
```

### Pull Request Process
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Test manually
5. Submit PR with description
6. Address review comments
7. Merge when approved

---

## 📞 Support

### Common Issues
1. **"Audiveris not found"**
   - Set AUDIVERIS_CLI environment variable
   - Install Java if using JAR
   - Check file permissions

2. **"Could not extract notation"**
   - Check image quality
   - Ensure staff lines are visible
   - Try higher DPI scan

3. **"Animation stuttering"**
   - Close other browser tabs
   - Check GPU acceleration enabled
   - Update graphics drivers

### Debug Mode
Enable console logging:
```javascript
// In index.js, add:
const DEBUG = true;

// Then use:
if (DEBUG) console.log('Quality:', imageQuality);
```

---

**Last Updated**: December 3, 2025  
**Maintainer**: Development Team  
**Version**: 2.0
