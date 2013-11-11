/*********************************************************************/
/*                  UPLOADER LIBRARY - README                        */
/*                                                                   */
/* The Uploader Library was created by Daniel Burnett (IceMetalPunk) */
/* and is free to use and modify under a Share-Alike license.        */
/*                                                                   */
/* More detailed information and usage documentation can be found at */
/*              http://imperfectdesigns.site11.com                   */
/*                                                                   */
/*********************************************************************/

Javascript Classes:
  Uploader
    -Uploader(picker[, bar])
    -Upload(chunksize[, overwrite?][, name])
    -abort()
    -getPercent()
    -setReceiver(url)
    -setDir(dir)
    -onprogress
    -onload

  ProgressBar
    -ProgressBar(parent)
    -setSize(width, height)
    -setColors(FGcolor, BGcolor)
    -setAmount(amount, max)
    -setPercent(percent)
    -getPercent()
