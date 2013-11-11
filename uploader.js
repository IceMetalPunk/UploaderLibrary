  /*********************************************************************************************************************/
  /*                            UPLOADER.JS - THE UPLOADER LIBRARY FRONTEND                                            */
  /*                                                                                                                   */
  /* This library is 100% free to use. The only limitation is that if you sell anything that uses it, you must include */
  /* this message with it.                                                                                             */
  /*                                                                                                                   */
  /* The Uploader library, both this Javascript/AJAX frontend and the PHP backend, was created by Daniel Burnett,      */
  /* a.k.a. IceMetalPunk.                                                                                              */
  /*                                                                                                                   */
  /* USAGE:                                                                                                            */
  /*                                                                                                                   */
  /* Place this in your Website's directory. You shouldn't need to change anything here, but it's commented in case    */
  /* you want to play around with it. If you do make modifications, you're still free to distribute it, as long as you */
  /* don't claim it as yours and abide by the restriction mentioned above.                                             */
  /*                                                                                                                   */
  /*********************************************************************************************************************/


/* BEGIN PROGRESS BAR CLASS */

  /* The ProgressBar class. Its constructor takes a page element at the end of which the progress bar will be inserted as a child */
  function ProgressBar(where) {

    /* Initialize some variables */
    this.parent=where;
    this.perc=0;

    /* Create the inner and outer bars and insert them onto the page */
    this.outer=document.createElement("div");
    this.inner=document.createElement("div");

    this.outer.className="progBG";
    this.inner.className="progFG";

    where.appendChild(this.outer);
    this.outer.appendChild(this.inner);

    /* The method to set the width and height of the progress bar */
    this.setSize=function(w, h) {
      this.outer.style.width=w;
      this.outer.style.height=h;
      this.inner.style.height=h;
    }

    /* The method to set the foreground and background colors of the progress bar, respectively */
    this.setColors=function(fgc, bgc) {
      this.outer.style.backgroundColor=bgc;
      this.inner.style.backgroundColor=fgc;
    }

    /* The method to set the progress bar's amount as an absolute value out of some maximum value */
    this.setAmount=function(n, max) {
      this.inner.style.width=(100*n/max)+"%";
      this.perc=n/max;
    }

    /* The method to set the progress bar's amount as a straight percentage */
    this.setPercent=function(p) {
      this.inner.style.width=p+"%";
      this.perc=p/100;
    }

    /* The method to return the current percentage of the progress bar. */
    this.getPercent=function() { return this.perc; }

  }

/* END PROGRESS BAR CLASS */

/* BEGIN CROSS-BROWSER SUPPORT WORKAROUNDS */

  /* Chrome doesn't support the sendAsBinary() function for XHR, which is required here. So we'll make our own if need be. */
  try {
    if (!XMLHttpRequest.prototype.sendAsBinary) {
      XMLHttpRequest.prototype.sendAsBinary = function(datastr) {
        function byteValue(x) { return x.charCodeAt(0) & 0xff; }
        var ords = Array.prototype.map.call(datastr, byteValue);
        var ui8a = new Uint8Array(ords);
        this.send(ui8a.buffer);
      }
    }
  }
  catch (e) {} 

/* BEGIN UPLOADER CLASS */

  /* The Uploader class. Its constructor takes a file input element (a <input type='file'> element) and optionally a progress bar to link to it.

     The input given here determines which element this instance will look at to find its file. The progress bar, an instance of the ProgressBar
     class, will be updated with the current upload progress of this Uploader instance. You don't need a progress bar, or you can link one to it
     later with Uploader.attachBar(ProgressBar). */

  function Uploader(finput, bar) {

    /* Initialize some variables */
    if (typeof bar=="undefined") { bar=null; }
    this.mypicker=finput;
    this.mybar=bar;
    this.perc=-1;
    this.thefile=this.mypicker.files[0] || null;
    var controller=this;

    /* You can set a function to trigger when an upload has finished by assigning it to Uploader.onload. If you do, it can take a single argument,
       which has a "size" property (with the total number of bytes uploaded) and a "name" property (with the final filename of that file, in case
       it was changed on the backend).

       So for example, you can do something like this:

       myUpload = new Uploader(document.upForm.filePicker);
       myUpload.onload = function(status) { alert(status.size+" bytes uploaded under the name "+status.name); } */

    this.onload=null;

    /* Similarly, you can set a function to trigger whenever a chunk of the file is sent. This one can take an argument that has two properties,
       "size" (which is the size of the chunk) and "percent" (which is the total percentage completion, between 0 and 1).

       For example:

       myUpload = new Uploader(document.upForm.filePicker);
       myUpload.onprogress = function(status) { document.getElementById("statusarea").innerHTML=(status.percent*100)+"%"; } */

    this.onprogress=null;
    /* These are the default receiver and directory, which you shouldn't need to change if you're using the default library files. Otherwise, you
       can use the Uploader.setReceiver(url) and Uploader.setDir(dir) methods below to change them. More info is in the comments for those methods. */
    this.receiver="uploader.php";
    this.dir="Uploads";

    /* The function that handles the response from the server */
    this.HandleXHR=function() {
      if (this.readyState==4) {
        /* If the file is done uploading, we set the percentage completion to -1, we update the progress bar to 100%, and we fire the onload event, if any */
        if (this.done) {
          controller.perc=1;

          /* Trigger the onprogress event, if one is set, to update the final progress. */
          if (controller.onprogress) { controller.onprogress({size:this.size, percent:controller.perc}); }

          controller.ShowProg(this.file.size, this.file.size);

          if (controller.onload) { controller.onload({"size":this.file.size, "name":controller.dir.replace(/\/+$/, "")+"/"+this.responseText}); }
        }

        /* If the file is not done uploading, we send the next chunk */
        else {

          /* When an upload is aborted, its percentage is simply set to -1. So if that's the case, we don't continue sending the next chunk. */
          if (controller.perc>=0) {

            /* Update the progress bar and the internal record of the upload progress percentage */
            controller.ShowProg(controller.perc, 1);

            /* Trigger the onprogress event, if one is set, to update the intermediate progress. */
            if (controller.onprogress) { controller.onprogress({size:this.size, percent:controller.perc}); }

            controller.SendChunk(this.file, this.responseText, this.size, this.blob+1, this.overwrite);
          }
        }
      }
    }
  
    /* The function to update the linked progress bar (if any) with the current upload progress. The n will be the number of bytes uploaded, the max
       will be the entire filesize. */  
    this.ShowProg=function(n, max) {
      if (this.mybar!=null) {
        this.mybar.setAmount(n, max);
      }
    }

    /* The major workhorse of the library. This sends a single chunk of the file to the server for uploading. The arguments are:
       f=the File object to send. name=the filename we're saving as. size=the chunk size. n=which chunk we're sending (0=first).
       overwrite=true/false (true to tell the server to overwrite existing files, false otherwise). */
    this.SendChunk=function(f, name, size, n, overwrite) {

      /* If the upload was aborted, its percentage of completion is set to -1; so if that's the case, we stop any prequeued sending */
      if (this.perc<0) { return false; }

      var len, start, blob;
      len=f.size;

      /* Calculuate the starting position and shrink the size of the chunk if there are fewer bytes left in the file */
      start=size*n;
      size=Math.min(len-start, size);

      /* Get the appropriate blob from the file */
      if (typeof f.slice!="undefined") { blob=f.slice(start, start+size); }
      else if (typeof f.mozSlice!="undefined") { blob=f.mozSlice(start, start+size); }
      else if (typeof f.webkitSlice!="undefined") { blob=f.webkitSlice(start, start+size); }

      /* Start a new AJAX request to the receiver on the server and prepare it for sending posted data */
      var req;
      req=new XMLHttpRequest();
      req.open("POST", this.receiver);
      req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

      /* Let the HandleXHR function handle this when the state changes so it'll capture the completed request */  
      req.onreadystatechange=this.HandleXHR;

      this.perc=(start/len);

      /* Store information about this chunk as local variables to the request, so the info can be accessed by HandleXHR later */
      req.blob=n;
      req.file=f;
      req.size=size;
      req.overwrite=overwrite;
      req.done=(start+size>=len); // If this chunk will finish the file, set "done" to true. Othwerwise, set it to false.
  
      /* Read the binary data from the blob, and when it's done, send it with the request, along with all our other parameters. Check the comments
         in the included uploader.php file for more information about these parameters. */
      var fr;
      fr=new FileReader();
      fr.onloadend=function() {

        var res=this.result;
        var ar=null;
        /* Since IE can't read binary strings directly, we need to convert its array into a string. Dammit, IE, you had ONE JOB. */
        if (!fr.readAsBinaryString) {
          ar=Uint8Array(res);
          res=String.fromCharCode.apply(null, ar);
        }

        req.sendAsBinary("fn="+escape(name)+"&dir="+escape(controller.dir)+"&overwrite="+(req.overwrite?1:0)+"&blob="+escape(n)+"&size="+escape(len)+"&content="+res);

        /* Considering the read and sent data can easily be large, we clean it up here */
        fr=null;
        req=null;
        ar=null;
      }

      /* Most modern browsers can read binary strings directly. Internet Explorer can't, because it's stupid. So we need to work around that. */
      if (fr.readAsBinaryString) { fr.readAsBinaryString(blob); }
      else { fr.readAsArrayBuffer(blob); }

      return true;
    }

    /* Set the upload directory. The server will be told to upload any of this instance's files to this directory, relative to the receiver's directory.
       For example, Uploader.setDir(".") will make it upload to the receiver's directory, while Uploader.setDir("MyUploadedFiles") will make it upload to
       the MyUploadedFiles folder within the receiver's directory. By default, these folders are created if they don't exist, full path and all.

       Returns true on success, false if an upload is in progress. To prevent corrupt uploads and errors, the upload directory can't be changed during an upload. */
    this.setDir=function(where) {
      if (this.perc>=0 && this.perc<1) { return false; }
      this.dir=where;
      return true;
    }

    /* Set the receiver. This should be a URL (usually a local one, like "uploader.php") that will receive the upload requests. You should leave this
       to its default, but if you want to experiment with different files, you can change that with this method.

       Returns true on success, false if an upload is in progress. To prevent corrupt uploads and errors, the upload directory can't be changed during an upload. */
    this.setReceiver=function(where) {
      if (this.perc>=0 && this.perc<1) { return false; }
      this.receiver=where;
      return true;
    }

    /* Just the little listener that remembers the file when this instance's linked file input changes value */
    this.Handle=function() {
      controller.thefile=this.files[0];
    }

    /* The function that initiates an upload. Uploader.Upload(chunkSize[, overwrite][, name]) will begin the upload with the currently chosen file in chunks
       of size chunkSize. If you set overwrite to true, it will tell the server to overwrite the file if it exists. Default is not to overwrite.

       If you want to specify the filename on the server that this should be uploaded as, you can set the name argument. Default is the original name
       of the chosen file. 

       Returns 1 on a successful initiation,
              -1 if no file has been chosen for this instance yet, or 
               0 if this instance is in the middle of an upload.

       While you can have multiple Uploaders working simultaneously, you cannot have one Uploader uploading multiple files at the same time. */
    this.Upload=function(chunksize, overwrite, name) {
      if (typeof overwrite=="undefined") { overwrite=false; }
      if (typeof name=="undefined") { name=null; }

      if (this.thefile==null) { return -1; }
      else if (this.perc>=0 && this.perc<1) { return 0; }
      else {
        this.perc=0;
        if (this.onprogress) { this.onprogress({size:0, percent:this.perc}); }
        this.SendChunk(this.thefile, name || this.thefile.name, chunksize, 0, overwrite);
        return 1;
      }
    }

    /* Abort the current upload, if any. */
    this.abort=function() { this.perc=-1; }

    /* Attach a ProgressBar to this instance. If one is already attached, it will be changed to the new one. */
    this.attachBar=function(what) { this.mybar=what; }

    /* Returns the percentage of upload completion, between 0 and 1. If no upload has started or the previous upload has been aborted, it's -1.
       Since uploading is asynchronous, you can set up an interval or a timeout loop to poll an Uploader instance for its completion percentage. */
    this.getPercent=function() {
      return this.perc;
    }

    this.mypicker.onchange=this.Handle;
  }