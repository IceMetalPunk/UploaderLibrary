<?php

  /*********************************************************************************************************************/
  /*                            UPLOADER.PHP - THE BACKEND TO THE UPLOADER LIBRARY                                     */
  /*                                                                                                                   */
  /* This library is 100% free to use. The only limitation is that if you sell anything that uses it, you must include */
  /* this message with it.                                                                                             */
  /*                                                                                                                   */
  /* The Uploader library, both the Javascript/AJAX frontend and this PHP backend, was created by Daniel Burnett,      */
  /* a.k.a. IceMetalPunk.                                                                                              */
  /*                                                                                                                   */
  /* USAGE:                                                                                                            */
  /*                                                                                                                   */
  /* Place this in your Website's directory. You shouldn't need to modify anything here on the backend, but everything */
  /* is commented, so feel free to play around! If you come up with anything useful, feel free to distribute it, as    */
  /* long as you comply with the restriction above.                                                                    */
  /*                                                                                                                   */
  /* Note that the Uploader frontend allows you to change the PHP file it connects to. Just note that any script that  */
  /* you use with it must have the following properties for accurate functionality:                                    */
  /*                                                                                                                   */
  /* 1) It must take the following format as its request body, which may not always be compatible with $_POST:         */
  /*    fn=[FILE_NAME]&dir=[SAVE_DIRECTORY]&overwrite=[1_OR_0]&blob=[CHUNK_NUMBER]&size=[FILE_SIZE]&content=[RAW_BLOB] */
  /*                                                                                                                   */
  /* 2) It must echo only the filename it saved the file as (no path, just the basename). This is generally the same   */
  /*    as the fn parameter above, except when the filename already exists and overwrite above is set to 0. In that    */
  /*    case, this script will rename the file to append a number to it and that's what's echo'd. You may change this, */
  /*    but the filename must still be the only thing echo'd.                                                          */
  /*                                                                                                                   */
  /* Note: Above, I use the word "blob". This is the term for a chunk of a file. Each time the backend script gets a   */
  /*       request, it contains only a chunk of the file (unless the entire file is smaller than the chunk size). This */
  /*       is something the script must take into account if you modify it.
  /*                                                                                                                   */
  /*********************************************************************************************************************/

  /* Get the body of the request and split it at every & symbol to separate the parameters */
  $cont=@file_get_contents("php://input");
  $cont=explode("&", $cont);

  /* As long as there are still parameters to process, process them */
  while (count($cont)>0) {

    /* Get the first parameter and split its name and value */
    $param=$cont[0];
    $param=explode("=", $param);

    /* If the parameter is not the file contents, store it in the $data array and remove it from our parameter array */
    if ($param[0]!="content") {
      $data[$param[0]]=urldecode($param[1]);
      array_splice($cont, 0, 1);
    }

    /* If it is the file contents, it should be last, so recombine the rest of the parameter array and stop processing */
    else {
      $cont=implode("&", $cont);
      break;
    }
  }

  /* Remove the "content=" prefix to what's left of the request body */
  $cont=explode("=", $cont);
  array_splice($cont, 0, 1);
  $cont=implode("=", $cont);

  /* If this is the first blob of our file, we should be creating a new file. Otherwise, we should be appending to the
     existing file. */
  $flags="w";
  if ($data["blob"]!=0) { $flags="a"; }

  /* If the "dir" parameter wasn't sent for some reason, assume the current directory */
  if (empty($data["dir"])) { $data["dir"]="."; }

  /* Since we're putting the trailing slash in, remove any already specified by the user */
  $data["dir"]=rtrim($data["dir"], "/");
  $data["dir"]=rtrim($data["dir"], "\\");

  /* If the specified directory doesn't exist, create it */
  if (!file_exists($data["dir"])) {
    mkdir($data["dir"], 0777, true);
  }

  /* If we're not supposed to overwrite files... */
  if ($data["overwrite"]==false) {

    /* Get the filename without the extension and the extension itself so we can insert numbers between them */
    $temp=pathinfo($data["fn"], PATHINFO_FILENAME);
    $ext=pathinfo($data["fn"], PATHINFO_EXTENSION);

    /* As long as the file already exsists and this is the first blob in our file, try a new name with a different number */
    for ($p=2; $data["blob"]==0 && file_exists($data["dir"]."/".$data["fn"]); ++$p) {
      $data["fn"]=$temp." (".$p.").".$ext;
    }
  }

  /* Write our blob content to the file, appending if this isn't blob 0. */
  $f=fopen($data["dir"]."/".$data["fn"], $flags);
  fwrite($f, $cont);
  fclose($f);

  /* Echo out the final filename for our frontend to grab. */
  echo $data["fn"];
?>