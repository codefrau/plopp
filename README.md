# impara's Plopp on SqueakJS

![Screenshot of Plopp showing a cartoonish 3D balloon-animal-like horse on a green field with a lake and rolling hills. Around the horse are 3D manipulators for movement, rotation, scaling, etc. This 3D scene is framed by UI elements with drawing tools, a sun dial, and other action buttons. A character in the lower right corner named Plipp is offering help.](README.png)

*PLOPP is a creative painting tool for cartoon-like 3D scenes without the effort that comes with professional 3D modelling programs. You can build 3D objects very easily! Just paint them in a 2D environment and PLOPP will transform them into 3D! The 3D objects can then be moved or rotated in order to arrange them in a true 3D scene. You can paint different backgrounds and adjust the lighting in the scene.* -- the [official Plopp site](http://www.planet-plopp.com/).

## License

**TL;DR** The [SqueakJS](https://squeak.js.org/) runtime and associated files are Open Source. The original [Plopp](http://www.planet-plopp.com/) application and its associated files are **not** Open Source.

For details, see [LICENSE.md](./LICENSE.md).

## Try it!

A live version is hosted on GitHub Pages at [codefrau.github.io/plopp/](https://codefrau.github.io/plopp/).

## Development notes

SqueakJS as a web runtime for Squeak applications does the bulk of the job. In addition to that basic runtime, Plopp needs access to 3D rendering. That renderer was based on the Croquet renderer of the time, which is supported by Vanessa's work on [Croquet Jasmine](https://github.com/codefrau/jasmine) emulating OpenGL on WebGL. Additionally, Plopp used Squeak's MPEG3Plugin to play back videos and sounds. The plugin version included in this repo is not a faithful implementation of that plugin, but good enough for Plopp's purposes (e.g. it only plays a fullscreen video overlay, and both sound and video are played directly through the browser, rather than delivering the decoded streams to Squeak).

## Contributors

For the contributors list of the original Plopp please watch the [outro clip](Contents/Resources/Clips/plopp-outro.mp4).

SqueakJS Contributors are listed in the [SqueakJS repo](https://github.com/codefrau/SqueakJS/graphs/contributors), and similarly for [Jasmine](https://github.com/codefrau/jasmine/graphs/contributors).

Contributors to this repo are listed [here](https://github.com/codefrau/plopp/graphs/contributors).