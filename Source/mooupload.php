<?php
/**
 *
 * Mooupload class
 * 
 * Provides a easy way for recept and save files from MooUpload
 * 
 * DISCLAIMER: You must add your own special rules for limit the upload of
 * insecure files like .php, .asp or .htaccess     
 * 
 * @author: Juan Lago <juanparati[at]gmail[dot].com>
 * 
 */       

class Mooupload 
{

	// Container index for HTML4 and Flash method
	const container_index = '_tbxFile';
	
			
	/**
	 *
	 * Detect if upload method is HTML5
	 * 	 
	 * @return	boolean
	 * 	 	  	 
	 */
	public static function is_HTML5_upload()
	{
		return empty($_FILES);
	}
	
	
	/**
	 *
	 * Upload a file using HTML4 or Flash method
	 * 
	 * @param		string	Directory destination path 	 	 	 	 
	 * @param		boolean	Return response to the script	 
	 * @return	array		Response
	 * 	 	  	 
	 */
	public static function HTML4_upload($destpath, $send_response = TRUE)
	{
	
		// Normalize path
		$destpath = self::_normalize_path($destpath);
			
		// Check if path exist
		if (!file_exists($destpath))
			throw new Exception('Path do not exist!');
		
		// Upload file using traditional method	
		$response = array();
  
	  foreach ($_FILES as $k => $file)
	  {
	    $response['key']         = (int)substr($k, strpos($k, self::container_index) + strlen(self::container_index));
	    $response['name']        = basename($file['name']);	// Basename for security issues
	    $response['error']       = $file['error'];
	    $response['size']        = $file['size'];
	    $response['upload_name'] = $file['name'];
	    $response['finish']      = FALSE;
	    
	    if ($response['error'] == 0)
	    {
	      if (move_uploaded_file($file['tmp_name'], $destpath.$file['name']) === FALSE)      
	        $response['error'] = UPLOAD_ERR_NO_TMP_DIR;
	      else
	        $response['finish'] = TRUE;
	              
	    }          
	  }   
	         
	 	// Send response to iframe 
		if ($send_response) 
	  	echo json_encode($response);    				
		
		return $response;	
	}
	
	
	/**
	 *
	 * Upload a file using HTML5
	 * 
	 * @param		string	Directory destination path	 	 	 	 	 
	 * @param		boolean	Return response to the script	 
	 * @return	array		Response
	 * 	 	  	 
	 */
	public static function HTML5_upload($destpath, $send_response = TRUE)
	{
	
		// Normalize path
		$destpath = self::_normalize_path($destpath);
			
		// Check if path exist
		if (!file_exists($destpath))
			throw new Exception('Path do not exist!');
					
		$response = array();
  
	  // Read headers
		$headers 	= getallheaders();
	  $protocol = $_SERVER['SERVER_PROTOCOL'];
	  
	  $max_upload 	= self::_convert_size(ini_get('upload_max_filesize'));
	  $max_post 		= self::_convert_size(ini_get('post_max_size'));
	  $memory_limit = self::_convert_size(ini_get('memory_limit'));
	  
	  $limit = min($max_upload, $max_post, $memory_limit);
	      
	  $response['id']    	= $headers['X-File-Id'];
	  $response['name']  	= basename($headers['X-File-Name']); 	// Basename for security issues
	  $response['size']  	= $headers['Content-Length'];
	  $response['error'] 	= UPLOAD_ERR_OK; 
	  $response['finish'] = FALSE;
	    
	  // Detect upload errors
		if ($headers['Content-Length'] > $limit) 
	    $response['error'] = UPLOAD_ERR_INI_SIZE;
			
		// Firefox 4 sometimes sends a empty packet as last packet
		/*	       
	  else if ($headers['Content-Length'] == 0)
	    $response['error'] = UPLOAD_ERR_NO_FILE;
	  */	    	  
		
		           
	  // Is resume?	  
		$flag = (bool)$headers['X-File-Resume'] ? FILE_APPEND : 0;
	  
	  $filename = $response['id'].'_'.$response['name'];
	  
	  $response['upload_name'] = $filename;
	  
	  
	    
	  // Write file
		if (file_put_contents($destpath.$filename, file_get_contents('php://input'), $flag) === FALSE)
	    $response['error'] = UPLOAD_ERR_CANT_WRITE;
	  else
	  {
	    if (filesize($destpath.$filename) == $headers['X-File-Size'])
	      $response['finish'] = TRUE;
	  } 
	    
	  
		// Return an ajax response
		if ($send_response)
		{
			header('Cache-Control: no-cache, must-revalidate');
		  header('Expires: Mon, 26 Jul 1997 05:00:00 GMT');
		  header('Content-type: application/json');
		  echo json_encode($response);
		}
	  
	  return $response;
	}
	
	
	/**
	 *	
	 * Detect the upload method and process the files uploaded
	 * 
	 * @param		string	Directory destination path	 	 	 	 	 
	 * @param		boolean	Return response to the script	 
	 * @return	array		Response
	 * 
	 */
	public static function upload($destpath, $send_response = TRUE)
	{			
		return self::is_HTML5_upload() ? self::HTML5_upload($destpath, $send_response) : self::HTML4_upload($destpath, $send_response);		
	}	 		 	 	
	
	
	
	/**
	 *
	 * Convert to bytes a information scale
	 * 
	 * @param		string	Information scale
	 * @return	integer	Size in bytes	 
	 *
	 */	 	 	 	 
	public static function _convert_size($val)
	{
		$val = trim($val);
	  $last = strtolower($val[strlen($val) - 1]);
	  
	  switch ($last) {
	    case 'g': $val *= 1024;
	 
	    case 'm': $val *= 1024;
	 
	    case 'k': $val *= 1024;
	  }
	 
	  return $val;
	}	
	
	
	/**
	 *
	 * Normalize a directory path
	 * 
	 * @param		string	Directory path
	 * @return	string	Path normalized	 
	 *
	 */	 	 	 	 
	public static function _normalize_path($path)
	{
		if ($path[sizeof($path) - 1] != DIRECTORY_SEPARATOR)
			$path .= DIRECTORY_SEPARATOR;
		
		return $path; 
	}	 	 	 	
	
}

?>
