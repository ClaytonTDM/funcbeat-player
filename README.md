# Funcbeat Player

Funcbeat is a statement-based sound synthesizer inspired by [SArpnt's Funcbeat](https://bytebeat.ficial.net/#5c7gAD8bVPZbtswEHyOvmIRJPURH7KdHoDhAkWf+9J+AU2tLcIUaXApu27Rf++Q8gUkggRI5HJmdnZkOZJVEn+pZm+ZVlQuaTqlgwpGrS0L1RyYFB6JKhpNylWklSNlj+oktMam1izCVZGwAot3ymn+4Rt2sW0yZKG9k0jOR65UVFh7fHp6KstydL56vcfMG2sjhFvR1vuK9lZppuhB7iEhoygXhazZcYaDUttC5pq1agUlgSHTbSE5JH1JrrS6vp61JwqtcUJ7DhsfmqS1AHMGi7WKdxrWqiL+nZ0Z4VNiSMiZ+1zkehEUeJE2o1zPWvFvmqhws/bNHiaJ8Q4+Wt1a6IW2EUFN7jNxAMdtz21KFiDEm43RBqbaU1EEjm1wtGmdTsepH00DkV3tTxV5QH+zoVhOgowjYQ2WW59dbUBtHqhEYy3pWrltKgCvb2Hesea0l2d/S0UKBOyuRteOj/XpHhErW3NgVzx0o9+biCGsaE7DIfX7lyRMwBe++4q/xdwBDel1sqAPNPs4oBeazwc0pdl8kMOxDWp9mfcm+OYykBxJ7w4c0BQ3JnqHChhe/7nStxbhWIH5zNLpeaYZfe28A888fQ+wOfkE7gm4xzSBDux0/Oy65jq0ozpw8XD387ys3ok/Fvtd/fj+Rxu/UzqkRSLray8XSWAf0uxzmbwoy84G6497JXDcxPqGMkK8OOfx6MOOEAmPISJR15nIxYyd0bvkhRh39SO5/gwH0HeZPIAJi0T9pRwkTa/L4uEcufuGM9Sy+Pcf).

## Features

- Interactive code editor with syntax highlighting
- Real-time sound synthesis and playback
- Customizable presets and settings

## Installation

1. Clone the repository:

   ```sh
   git clone https://github.com/yourusername/funcbeat.git
   ```

2. Navigate to the project directory:

   ```sh
   cd funcbeat
   ```

3. Install the dependencies:

   ```sh
   npm install
   ```

## Usage

Start the development server (Linux and macOS):

   ```sh
   npm dev
   ```

And if you're on Windows:

   ```sh
   npm run dev:windows
   ```

Build the project for production:

   ```sh
   npm run build
   ```

## How to Use

Funcbeat uses JavaScript to generate audio in real-time. Here's how to create sounds:

1. Your code should return a function that takes `time` and `sampleRate` parameters
2. Static variables can be declared outside the function for persistent state
3. The function should return a value between -1 and 1 for each sample

Example (created by SArpnt):

```javascript
let lastSample = 0; // variables here are static and can always be accessed
let resonanceMomentum = 0;
const notedata = "$$$000,,,,,,,,''"; // this is a good place to store constants like note values because creating arrays and such constantly ruins performance
// note that this is a bad example, a string like this isn't an issue
// this is also a good place to do decompression calculations, for storing things like samples efficiently

return function (time, sampleRate) { // time is in secs, note that samplerate can still change the sound when static variables are used, this is why samplerate is given
	const pitch = 2 ** ((notedata.charCodeAt(time * 4.3 & 15) + 22) / 12); // grab values from string and convert semitones to hz
	const pulse = ((time * pitch % 1 > (time / 2 % 1) * .6 + .2) - .5) / 2; // generate pulse wave
	lastSample += resonanceMomentum += (pulse - lastSample - resonanceMomentum * 3) / (cos(time / 5) * 170 + 200); // lowpass with resonance, doesn't work on other samplerates
	const kick = (sin((time * 4.3 % 2 + .01) ** .3 * 180)) / 4;
	return lastSample + kick;
}
```

Key Concepts:

- Use static variables outside the function for persistent state
- Time is in seconds
- Sample rate may vary, affecting sound when using static variables
- Store constants like note values outside the function for better performance
- Return values should stay within the [-1, 1] range

## License <!-- contain s... abt normal and inter font license -->

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.

This project uses the [Inter](https://rsms.me/inter/) font, which is licensed under the SIL Open Font License.

## Acknowledgements

- Inspired by and (mostly) compatible with [SArpnt's Funcbeat](https://bytebeat.ficial.net/)
- [CodeMirror](https://codemirror.net/) for the code editor
- [Tailwind CSS](https://tailwindcss.com/) for the styling