<?php

// Load mooupload class
require('..'.DIRECTORY_SEPARATOR.'source'.DIRECTORY_SEPARATOR.'mooupload.php');

// Upload file to tmp directory
Mooupload::upload(dirname(__FILE__).DIRECTORY_SEPARATOR.'tmp'.DIRECTORY_SEPARATOR);
?>
