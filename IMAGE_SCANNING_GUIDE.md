# Chord Scanner - Image Processing Setup

The chord scanner now supports both PDF and image files (PNG, JPG, TIFF, etc.) for music score recognition.

## What Changed

### Backend Enhancement
- Added image preprocessing using the `sharp` library
- Images are automatically enhanced before OCR:
  - Resized to A4 at 300 DPI (optimal for Audiveris)
  - Converted to grayscale
  - Normalized contrast
  - Sharpened for better staff line detection
  - Saved as TIFF (preferred by Audiveris)

### Installation Required

Install the `sharp` package in the backend:

```bash
cd backend
npm install sharp
```

Or if you already have package.json updated:
```bash
cd backend
npm install
```

## Usage Tips

### For Best Results with Images:

1. **Resolution:** Use at least 300 DPI (higher is better)
2. **Contrast:** Black notes on white background with clear staff lines
3. **Lighting:** Ensure even lighting if photographing
4. **Straightness:** Keep the page as straight as possible
5. **Quality:** Avoid blurry, skewed, or low-resolution images

### Recommended Workflow:

**Option 1: Scanner (Best Quality)**
- Scan at 300-400 DPI
- Use grayscale or black & white mode
- Save as PNG or TIFF

**Option 2: Phone Camera**
- Use a document scanning app (CamScanner, Adobe Scan, etc.)
- These apps auto-enhance and straighten documents
- Export as high-quality image

**Option 3: Digital Camera**
- Use good lighting (daylight or bright LED)
- Keep camera parallel to the page
- Use highest resolution setting
- Avoid shadows

### File Formats Supported:
- ✅ **PDF** - Works great with digital or clean scanned PDFs
- ✅ **PNG** - Good for screenshots and scanned images
- ✅ **JPG/JPEG** - Works but PNG is preferred for line art
- ✅ **TIFF** - Best format for scanned documents
- ✅ **BMP** - Supported but large file size

## Troubleshooting

### "Could not extract notation" Error

This means Audiveris couldn't detect musical staves. Try:

1. **Check image quality:**
   - Is it blurry? → Rescan at higher resolution
   - Is it skewed? → Straighten the image
   - Is contrast poor? → Adjust brightness/contrast

2. **Check content:**
   - Is it handwritten? → Audiveris only works with printed music
   - Are staff lines clear? → They must be visible and continuous
   - Is it a chord chart? → Need actual music notation with staves

3. **Improve your scan:**
   - Increase DPI to 400 or 600
   - Use black & white mode (not color)
   - Ensure page is flat and straight
   - Clean the scanner glass

### Still Not Working?

- Try converting to PDF first (many tools can do this)
- Use a professional document scanner instead of phone camera
- Ensure the score is printed music notation (not guitar tabs or chord charts)

## Technical Details

The preprocessing pipeline:
```javascript
sharp(imagePath)
  .resize({ width: 2480, height: 3508, fit: 'inside' }) // A4 at 300 DPI
  .grayscale()                                          // Remove color
  .normalise()                                          // Auto-contrast
  .sharpen()                                            // Enhance edges
  .tiff({ compression: 'lzw' })                        // Save as TIFF
```

This ensures images are in the optimal format for Audiveris OMR engine.
