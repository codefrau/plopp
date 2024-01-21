# TL;DR

 The SqueakJS runtime and associated files are Open Source. The original Plopp application and its associated files are not.

## Plopp (c) impara GmbH, Magdeburg, 2007

Impara GmbH / www.impara.de (impara) makes information and products available, subject to the following terms and conditions. By using this software, you agree to these terms and conditions. Impara reserves the right to change these terms and conditions, and the products, services, prices, and programs mentioned at any time, at its sole discretion, without notice. impara reserves the right to seek all remedies available by law and in equity for any violation of these terms and conditions. Any rights not expressly granted herein are reserved.

EXCEPT AS EXPRESSLY PROVIDED OTHERWISE IN AN AGREEMENT BETWEEN YOU AND impara, ALL INFORMATION AND SOFTWARE ARE PROVIDED "AS IS" WITHOUT WARRANTY OR CONDITIONS OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

Impara ASSUMES NO RESPONSIBILITY FOR ERRORS OR OMISSIONS IN THE INFORMATION OR SOFTWARE OR OTHER DOCUMENTS WHICH ARE REFERENCED BY OR LINKED TO THIS SOFTWARE.

IN NO EVENT SHALL impara BE LIABLE FOR ANY SPECIAL, INCIDENTAL, INDIRECT OR CONSEQUENTIAL DAMAGES OF ANY KIND, OR ANY DAMAGES WHATSOEVER (INCLUDING WITHOUT LIMITATION, THOSE RESULTING FROM: (1) RELIANCE ON THE MATERIALS PRESENTED, (2) COSTS OF REPLACEMENT GOODS, (3) LOSS OF USE, DATA OR PROFITS, (4) DELAYS OR BUSINESS INTERRUPTIONS, (5) AND ANY THEORY OF LIABILITY, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF INFORMATION) WHETHER OR NOT impara HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

### Files

The above copyright notice was included in the original app as file [copyright](./copyright). Here's a list of the files in that app. Some files only relevant to Linux have been omitted, the rest has been included unmodified in this repository, except as noted here:

    Contents/
        Plopp.sh            (omitted)
        copyright
        readme.txt
        Linux386/           (omitted)
        Resources/
            UserData.zip
            plopp.image
            Clips/
                *.mpg
                *.mp4       (added, converted from *.mpg)
            Sites/
                *.html      (fixed links, inserted 1 line to allow SWF playback)
                stuff/
                    *.png
                    *.swf
                    *.css
            Sounds/
                *.mp3

* The `mp4` files were added since MPEG-2 files are less well supported on modern web browsers than MPEG-4
*  The `ruffle` player was included in the HTML because modern web browsers do not support playback of Adobe Flash files. Also, links were fixed to point to current URLs on planet-plopp.com.
* additionally, an `sqindex.json` was added to each directory to allow SqueakJS to fetch directory indexes, generated using [`mkindex.py`](https://github.com/codefrau/SqueakJS/blob/main/utils/mksqindex.py).

### Explanation

Plopp was a commercial product released by impara GmbH in Magdeburg (Germany) in 2006. The copy in this repository is an English language version that is unmodified from the original free (as in beer) Linux application, which is still downloadable (as of this writing in January 2024) on [planet-plopp.com](http://www.planet-plopp.com/english/download.html) as [plopp_1.2.3-2.tar.gz](http://www.planet-plopp.com/downloads/en/plopp_1.2.3-2.tar.gz).

It was implemented in [Squeak](https://squeak.org), and included a Virtual Machine for 32 bit x86 Linux, which is Open Source. This compiled VM has been omitted, and replaced by the SqueakJS VM (see below).

## SqueakJS Runtime (c) 2024 Vanessa Freudenberg

SqueakJS itself is MIT licensed, see [SqueakJS](https://github.com/codefrau/SqueakJS/).

Additionally, some plugins in the [`vm/` directory](./vm) were taken and adapted for the Plopp runtime from Vanessa's [Croquet Jasmine VM](https://github.com/codefrau/jasmine/). All of this is MIT licensed.

The `index.*` files start the application using SqueakJS and the plugins loaded from the `vm/` directory.

### Files

    LICENSE.md
    README.md
    README.png
    index.html  (main entry point)
    index.css
    index.png   (screenshot from Contents/Resources/Clips/plopp-intro.mpg)
    index.mp3   (shortened from Contents/Resources/Sounds/intro01.mp3)
    vm/
        *.js    (SqueakJS VM + plugins)
