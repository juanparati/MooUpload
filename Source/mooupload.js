/*
---
script: MooUpload

description: Crossbrowser file upload.

license: GNU/GPL license.

authors: 
	- Juan Lago <juanparati[at]gmail[dot]com>
	
requires: 
	core:1.3.2 
  	- Element.Event
  	- Fx.Elements
  	- Fx.Tween  

provides: [MooUpload]
...
*/

var progressSupport = ('onprogress' in new Browser.Request);

// Extend Request class for allow send binary files 
Request.implement({
				
  sendBlob: function(blob){        
    
    this.options.isSuccess = this.options.isSuccess || this.isSuccess;
    this.running = true;
                
    var url = String(this.options.url), method = this.options.method.toLowerCase();        
            
    if (!url) url = document.location.pathname;
    
    var trimPosition = url.lastIndexOf('/');
    if (trimPosition > -1 && (trimPosition = url.indexOf('#')) > -1) url = url.substr(0, trimPosition);
    
    if (this.options.noCache)
    	url += (url.contains('?') ? '&' : '?') + String.uniqueID();
            
    var xhr = this.xhr;
        
    if (progressSupport) { 
    	xhr.onloadstart = this.loadstart.bind(this);
    	xhr.onprogress = this.progress.bind(this);
    }
        
    xhr.open(method.toUpperCase(), url, this.options.async, this.options.user, this.options.password);
    if (this.options.user && 'withCredentials' in xhr) xhr.withCredentials = true;
    
    xhr.onreadystatechange = this.onStateChange.bind(this);
    
    Object.each(this.headers, function(value, key){
    	try {
    		xhr.setRequestHeader(key, value);
    	} catch (e){
    		this.fireEvent('exception', [key, value]);
    	}
    }, this);
    
    this.fireEvent('request');    
    xhr.send(blob);    
    if (!this.options.async) this.onStateChange();
    if (this.options.timeout) this.timer = this.timeout.delay(this.options.timeout, this);
    return this;
	 }
});


// MooUpload class  
var MooUpload = new Class({
  Implements: [Options, Events],
  
  options: {    
    action: 'upload.php',
    draggable: true,
    accept: '*/*',    
    method: 'auto',    
    multiple: true,    
    autostart: false,
    listview: true,    
    blocksize: 1024000,        // I don't recommend less of 101400 and I more of 5020000
    maxuploadspertime: 2, 
    minfilesize: 1,
    maxfilesize: 0,  
    
    flash: {
      movie: 'Moo.Uploader.swf'
    },
    
    texts: {
      error      : 'Error',
      file       : 'File',
      filesize   : 'Filesize',
      filetype   : 'Filetype',
      nohtml5    : 'Not support HTML5 file upload!',
      noflash    : 'Please install Flash 8.5 or highter version (Have you disabled FlashBlock or AdBlock?)',
      sel        : 'Sel.',      
      selectfile : 'Add files',
      status     : 'Status',     
      startupload: 'Start upload',            
      uploaded   : 'Uploaded'                 
    },
    
    onAddFiles: function(){},
    onBeforeUpload: function(){},    
    onFileDelete: function(fileindex){},    
    onFileUpload: function(fileindex){},  
    onFileUploadError: function(fileindex, response){},      
    onFinishUpload: function(){}, 
    onSelect: function(){},   
    onSelectError: function(error, filename, filesize){}        
  },
  
  filelist: new Array(),
  lastinput: undefined,
  uploadspertime: 0,
  uploading: true,
  flashobj: null,
  
  
  /*
	Constructor: initialize
		Constructor

		Add event on formular and perform some stuff, you now, like settings, ...
	*/
  initialize: function (container, options) {
    
    this.container = document.id(container);
    
    this.setOptions(options);           
             
    // Extend new events
    Object.append(Element.NativeEvents, {dragenter: 2, dragexit: 2, dragover: 2, drop: 2});
              
    // Call custom method
    this[this.options.method](this.container);
        
  },
  
  
  /*
	Function: baseHtml
		Private method

		Deploy standard html
	*/
  baseHtml: function (subcontainer) {  
  
    var subcontainer_id = subcontainer.get('id');       
                            
    // Add buttons container
    var btnContainer = new Element('div', {
      'class': 'mooupload_btncontainer'
    }).inject(subcontainer);
    
    
    // Add addfile button
    var btnAddFile = new Element('button', {
      id:   subcontainer_id+'_btnAddfile',
      html: this.options.texts.selectfile,
      type: 'button',
      'class': 'addfile'      
    }).inject(btnContainer);
    
    this.newInput(subcontainer);
        
    // Show start upload button
    if (!this.options.autostart) {
      
      var btnStart = new Element('button', {
        id: subcontainer_id+'_btnbStart',
        html: this.options.texts.startupload,
        type: 'button',
        'class': 'start'
      }).inject(btnContainer);
            
      btnStart.addEvent('click', function() {      
        this.upload(subcontainer);                               
      }.bind(this));
    }
    
    var progresscont = new Element('div', {
      'id': subcontainer_id+'_progresscont',
      'class': 'progresscont'                                            
    }).inject(btnContainer); 
    
    new Element('div', {
      id: subcontainer_id+'_progressbar',
      html: '0%',
      'class': 'mooupload_on mooupload_progressbar'
    }).inject(progresscont);       
    
    // Create file list container
    if (this.options.listview)
    {
            
      var listview = new Element('div', {
        id: subcontainer_id+'_listView',
				'class': 'mooupload_listview'      
      }).inject(subcontainer);
      
      var ulcontainer = new Element('ul').inject(listview);
      
      var header = new Element('li', {
        'class': 'header'                
      }).inject(ulcontainer);
      
      new Element('div', {
        'class': 'optionsel',
        html: this.options.texts.sel
      }).inject(header);                        
      
      new Element('div', {
        'class': 'filename',
        html: this.options.texts.file
      }).inject(header);
      
      /*
      new Element('div', {
        'class': 'filetype',
        html: this.options.texts.filetype
      }).inject(header);
      */
            
      new Element('div', {
        'class': 'filesize',
        html: this.options.texts.filesize
      }).inject(header);
    
      new Element('div', {      
        'class': 'result',
        html: this.options.texts.status         
      }).inject(header);    
        
    }  
                                        
  }, 
  
  htmlAddFile: function(subcontainer)
  {
    var subcontainer_id = subcontainer.get('id');
    
    document.id(subcontainer_id+'_btnAddfile').addEvent('click', function(e) {
      new Event(e).stop();
            
      // Click trigger for input[type=file] only works in FF 4.x, IE and Chrome
      this.lastinput.click();
      
      this.progressIni(document.id(subcontainer_id+'_progresscont'));            
                       
    }.bind(this)); 
  },
  
  newInput: function(subcontainer)
  {
  
    var subcontainer_id = document.id(subcontainer).get('id');
    var inputsnum = this.countContainers(subcontainer);
    var formcontainer = subcontainer;
    
    // Hide old input
    if (inputsnum > 0)
    {
      document.id(subcontainer_id+'_tbxFile'+(inputsnum - 1)).setStyles({
        top: 0,
        left: 0,
        styles: {
          display: 'none'
        }
      });      
    }
            
    if (this.options.method == 'html4')
    {
      formcontainer = new Element('form', {
        id: subcontainer_id+'_tbxFile'+this.countContainers(subcontainer),
        name: subcontainer_id+'_frmFile'+this.countContainers(subcontainer),
        enctype: 'multipart/form-data',
        encoding: 'multipart/form-data',  // I hate IE
        method: 'post',
        action: this.options.action,        
        target: subcontainer_id+'_frmFile'
      }).inject(subcontainer);            
                  
      if (this.options.maxfilesize > 0)
      {
        new Element('input', {
          name: 'MAX_FILE_SIZE',
          type: 'hidden',
          value: this.options.maxfilesize 
        }).inject(formcontainer);
      }
    }
        
    // Input File
    this.lastinput = new Element('input', {
      id: subcontainer_id+'_tbxFile'+this.countContainers(subcontainer),
      name: subcontainer_id+'_tbxFile'+this.countContainers(subcontainer),
      src: 'http://www.google.com',
      type: 'file',
      size: 1,
      styles: {                             
                position:'absolute',
                top:0,
                left:0,
                border:0                
              },
      multiple: this.options.multiple,
      accept: this.options.accept
      
    }).inject(formcontainer);
    
        
    // Old version of firefox and opera don't support click trigger for input files fields    
    // Internet "Exploiter" do not allow trigger a form submit if the input file field was not clicked directly by the user
    if (this.options.method != 'flash' && (Browser.firefox2 || Browser.firefox3 || Browser.opera || Browser.ie))
    {      
      // Get addFile attributes
      var addfileposition = document.id(subcontainer_id+'_btnAddfile').getPosition();
      var addfilesize     = document.id(subcontainer_id+'_btnAddfile').getSize();
      
      this.lastinput.setStyles({
        top: addfileposition.y,
        left: addfileposition.x - 1,
        width: addfilesize.x + 2, // Extra space for cover button border
        height: addfilesize.y,
        opacity: 0.0001,    // Opera opacity ninja trick
        '-moz-opacity': 0
      });
    
    }
    else
      this.lastinput.setStyle('visibility', 'hidden');
    
    
    // Create events
    this.lastinput.addEvent('change', function(e) {
      
      new Event(e).stop();            
      
      if (this.options.method == 'html4')
      {
        this.addFiles([{
          name: this.getInputFileName(this.lastinput, subcontainer), 
          type: null,
          size: null
        }], subcontainer);
                   
      }
      else
      {
        this.addFiles(this.lastinput.files, subcontainer);
      }             
                    
    }.bind(this));
    
  },
  
  upload: function(subcontainer) {
        
    this.uploading = false;
      
    this.fireEvent('onBeforeUpload');
    
    var subcontainer_id = document.id(subcontainer).get('id');
    
    if (this.options.listview)
    {                                                
      document.id(subcontainer_id+'_listView').getElements('li.item').addClass('mooupload_readonly');
      document.id(subcontainer_id+'_listView').getElements('a').setStyle('visibility', 'hidden');                              
    }
    
    this.progressStep(document.id(subcontainer_id+'_progresscont'));
                    
    this[this.options.method+'Upload'](subcontainer);
     
  },
  
  progressStep: function(progressbar) {        
                    
    if (progressbar.getStyle('display') == 'none')
      progressbar.setStyle('display', 'block');
    
    var progress = progressbar.getChildren('div');    
    var uploaded = 1;
    var checked = 1;
                  
    for (var i = 0, f; f = this.filelist[i]; i++)
    {
      if (f.checked)
      {
        checked++;
        
        if (f.uploaded)
          uploaded++;
      }
						      
    }        
              
    var percent = (uploaded / checked) * 100; 		           
                                                                      
		progress.set('tween', {duration: 'short'});
    progress.tween('width', percent+'%');
    
    progress.set('html', percent.ceil()+'%');
          
    if (percent >= 100)
    {                      
			this.uploading = false; 
      progress.removeClass('mooupload_on');
      progress.addClass('mooupload_off');
      
      this.fireEvent('onFinishUpload');               
    }
                                            
  },
    
    
  progressIni: function(progressbar) {
         
    var progress = progressbar.getChildren('div');
    
    progress.removeClass('mooupload_off');
    progress.addClass('mooupload_on');
    
    progressbar.setStyle('display', 'none');
    
    progress.setStyle('width', 0);
    progress.set('html', '0%');
  },
  
    
  /*
	Function: addFiles
		Public method

	  Add new files
	*/
  addFiles: function(files, subcontainer) {   
  
    var subcontainer_id = subcontainer.get('id');                                               
    
    if (this.options.listview && subcontainer !== undefined)
      var listcontainer = document.id(subcontainer.get('id')+'_listView').getElement('ul');                                
    
    for (var i = 0, f; f = files[i]; i++)
    {
          
      var fname = f.name || f.fileName;
      var fsize = f.size || f.fileSize;
      
      if (fsize != undefined)
      {
      
        if (fsize < this.options.minfilesize)
        {                    
          this.fireEvent('onSelectError', ['minfilesize', fname, fsize]); 
          return false;
        }
        
        if (this.options.maxfilesize > 0 && fsize > this.options.maxfilesize)
        {        
          this.fireEvent('onSelectError', ['maxfilesize', fname, fsize]);          
          return false;
        }
        
      }
      
      this.filelist[this.filelist.length]  = { 
                        id: String.uniqueID(), 
                        checked: true,                       
                        name: fname,
                        type: f.type || f.extension,
                        size: fsize,
                        uploaded: false, 
												uploading: false,                       
                        error: false
                      }; 
            
      
      if (this.options.listview && subcontainer !== undefined)
        this.addFileList(subcontainer, listcontainer, this.filelist[this.filelist.length - 1]);
                                                                                                                                                         
    }
      
    //console.log(this.filelist);
    
    this.fireEvent('onAddFiles');
                       
    this.newInput(subcontainer);
    
    if (this.options.autostart)       
      this.upload(subcontainer);    
        
  },
  
  
  addFileList: function(maincontainer, subcontainer, file)
  {
    
    var maincontainer_id = maincontainer.get('id');
       
    var elementcontainer = new Element('li', {
      'class': 'item'
    }).inject(subcontainer);
            
    var optionsel = new Element('div', {
      'class': 'optionsel'
    }).inject(elementcontainer);
    
        
    var optiondelete = new Element('a', {
      id: maincontainer_id+'_delete'+this.filelist.length,
      'class': 'delete'      
    }).inject(optionsel);
    
    
    var fileindex = this.filelist.length - 1;
    
    optiondelete.addEvent('click', function(e) {
      e.stop();            
      
      //this.filelist.splice(fileindex, 1);
      this.filelist[fileindex].checked = false;
                              
      optiondelete.removeEvents('click');      
      optiondelete.getParent('li').destroy();
      
      this[this.options.method+'Delete'](fileindex);
      
      this.fireEvent('onFileDelete', [fileindex]);
    }.bind(this));
    
    
    new Element('div', {
      'class': 'filename',
      html: file.name
    }).inject(elementcontainer);
    
    /*
    new Element('div', {
      'class': 'filetype',
      html: file.type || file.extension || 'n/a'
    }).inject(elementcontainer);
    */
    
    new Element('div', {
      'class': 'filesize',
      html: (file.size || 'n/a') +' bytes'
    }).inject(elementcontainer);
    
    new Element('div', {
      id: maincontainer_id+'_file_'+this.filelist.length,
      'class': 'result'          
    }).inject(elementcontainer);      
  
    elementcontainer.highlight('#FFF', '#E3E3E3');
    
  },

  
  getContainers: function(subcontainer)
  {
    return subcontainer.getElements('input[type=file]');
  },
  
  getForms: function(subcontainer)
  {
    return subcontainer.getElements('form');
  },
  
  countContainers: function(subcontainer)
  {
    var containers = this.getContainers(subcontainer);
    
    return containers.length;
  },
  
  
  // ------------------------- Specific methods for auto ---------------------
  
  /*
	Function: flash
		Private method

		Specific method for flash
	*/
	
  auto: function(subcontainer) {
    
    // Check html5 support        
    if (window.File && window.FileList && window.Blob)
    {            
      this.options.method = 'html5';
      
      // Unfortunally Opera 11.11 have an incomplete Blob support
      if (Browser.opera && Browser.version <= 11.11)
        this.options.method = 'auto';        
    }
    
    // Check flash support
    if (this.options.method == 'auto' && Browser.Plugins.Flash && Browser.Plugins.Flash.version >= 9)     
      this.options.method = 'flash';
      
    // Default html4
    if (this.options.method == 'auto')
      this.options.method = 'html4';
    
    this[this.options.method](subcontainer);
     	 
	},
  
  // ------------------------- Specific methods for flash ---------------------
  
  /*
	Function: flash
		Private method

		Specific method for flash
	*/
  flash: function (subcontainer) {
    var subcontainer_id = subcontainer.get('id');
    
    // Check if Flash is supported
    if (!Browser.Plugins.Flash || Browser.Plugins.Flash.version < 9)
    {
      subcontainer.set('html', this.options.texts.noflash);
      return false;
    }
    
    this.baseHtml(subcontainer);	
        
    
    // Translate file type filter
    var filters = this.flashFilter(this.options.accept);
                     
    var btnsize = document.id(subcontainer_id+'_btnAddfile').getSize();
    var btnposition = document.id(subcontainer_id+'_btnAddfile').getPosition();
    
    // Create container for flash
    var flashcontainer = new Element('div', {
      id: subcontainer.get('id')+'_flash',
      styles: {        
        position: 'absolute',
        top: btnposition.y,
        left: btnposition.x
      }
    }).inject(subcontainer);	 
   
    // Deploy flash movie
    this.flashobj = new Swiff(this.options.flash.movie, {
      container: flashcontainer.get('id'),
      width: btnsize.x,
      height: btnsize.y,      
      params: {
        wMode: 'transparent',
        bgcolor: '#000000'
      },
      callBacks: {
        
        load: function() {  
                          
          Swiff.remote(this.flashobj.toElement(), 'xInitialize', {
            multiple: this.options.multiple,
            url: this.options.action,
            method: 'post',
            queued: this.options.maxuploadspertime,            
            fileSizeMin: this.options.fileminsize,
            fileSizeMax: this.options.filemaxsize,
            typeFilter: filters,
            mergeData: true,
            data: this.cookieData(),                                               
            verbose: true
          });  
                                                
		    }.bind(this),
        
        select: function(files) {                                                
          this.addFiles(files[0], subcontainer);	  
          
          this.progressIni(document.id(subcontainer_id+'_progresscont'));               
		    }.bind(this),
		    
		    complete: function(resume) {
		      this.uploading = false;		      		      		      		      
		    }.bind(this),
		    
		    fileOpen: function(file) {										
							      
		    }.bind(this),
		    
		    fileProgress: function (file) {
		           		      		      
		      if (this.options.listview)
          {
            var respcontainer = document.id(subcontainer_id+'_file_' + file[0].id);
                        
            respcontainer.set('html', file[0].progress.percentLoaded+'%');                                                                 
          }
		      		      
		    }.bind(this),
		    
		    fileComplete: function(file) {
		                                                         
					this.filelist[file[0].id - 1].uploaded = true;
          
          if (this.options.listview)
          {
            
            var respcontainer = document.id(subcontainer_id+'_file_' + file[0].id);
            
            if (file[0].response.error > 0)
            {
              respcontainer.addClass('mooupload_error');
              respcontainer.set('html', this.options.texts.error);
            }
            else
            {
              respcontainer.addClass('mooupload_noerror');
              respcontainer.set('html', this.options.texts.uploaded);
            }                      
          }	
          	                		      
          
          this.progressStep(document.id(subcontainer_id+'_progresscont'));
		      		      		      
		      this.fireEvent('onFileUpload', [file[0].id]);
		      
		    }.bind(this)
		    		    		    
      }
    });
    
    flashElement = this.flashobj.toElement();
        
    // Check flash load
    if (!flashElement.getParent() || flashElement.getStyle('display') == 'none')
    {
      subcontainer.set('html', this.options.texts.noflash);
      return false;
    }        
	 			  
  },
  
  flashUpload: function(subcontainer)
  {
    
    if (!this.uploading)
    {
    
      this.uploading = true;
                     
      for (var i = 0, f; f = this.filelist[i]; i++)
      {              
        if (!f.uploading)
        {
          Swiff.remote(this.flashobj.toElement(), 'xFileStart', i + 1);
          this.filelist[i].uploading = true;
        }                                                                                                                                                                     
      }
            
    }      
          
  },
  
  flashDelete: function(fileindex)
  {
    this.filelist[fileindex].checked = false;
    Swiff.remote(this.flashobj.toElement(), 'xFileRemove', fileindex + 1);        
  },  
  
  flashFilter: function(filters)
  {
    filters = filters.split(',');
    
    var filtertypes = new Array();
    var assocfilters = new Object();        
    
    filters.each(function(item, index) {
      
      var keyvalue = item.split('/');
       
      if (filtertypes[keyvalue[0]] != undefined)
        filtertypes[keyvalue[0]] += ' *.'+keyvalue[1]+';';
      else
        filtertypes[keyvalue[0]] = '*.'+keyvalue[1]+';';
        
    });
            
    
    // Filtertypes is not an associative array is an object! 
    // (See: http://www.hunlock.com/blogs/Mastering_Javascript_Arrays#quickIDX9)
    Object.each(filtertypes, function(item, index, obj) {
      var extension = item;     
      var newindex = index.capitalize();                   
      
      if (item == '*.*;')
      {                        
        switch (index)
        {
          case 'image':
            extension = '*.jpg; *.jpeg; *.gif; *.png; *.bmp;';
            break;
          case 'video':
            extension = '*.avi; *.mpg; *.mpeg; *.flv; *.ogv; *.webm; *.mov; *.wm;';
            break;
          case 'text':
            extension = '*.txt; *.rtf; *.doc; *.docx; *.odt; *.sxw;';
            break;
          case '*':
            extension = '*.*;'
            newindex = 'All Files';
            break;            
        }
      }
                        
      assocfilters[newindex + ' ('+extension+')'] = extension;
            
    });
                                                   
    return assocfilters;
        
  },
  
  // appendCookieData based in Swiff.Uploader.js
  cookieData: function() {
    
    var hash = {};
    
    document.cookie.split(/;\s*/).each(function(cookie) {
    
      cookie = cookie.split('=');
      
      if (cookie.length == 2) {
        hash[decodeURIComponent(cookie[0])] = decodeURIComponent(cookie[1]);
      }
    });
        
    return hash;
  },
         
  // ------------------------- Specific methods for html5 ---------------------
  
  /*
	Function: html5
		Private method

		Specific method for html5
	*/
  html5: function (subcontainer) {    
    
    // Check html5 File API    
    if (!window.File && !window.FileList && !window.Blob)
    {
      subcontainer.set('html', this.options.texts.nohtml5);
      return false;          
    }        
        
    this.baseHtml(subcontainer);    
    
    // Trigger for html file input
    this.htmlAddFile(subcontainer);    
    
  },
      
  html5Upload: function(subcontainer)
  {
           
    var filenum = 0;
    
    this.getContainers(subcontainer).each(function(el) {
      
      var files = el.files;            
      
      for (var i = 0, f; f = files[i]; i++)
      {
        
        if (this.uploadspertime <= this.options.maxuploadspertime)
        {
  
          //console.log(f.name+' = '+this.filelist[filenum].name);
                              
          // Upload only checked and new files
          if (this.filelist[filenum].checked && !this.filelist[filenum].uploading)
          { 
            this.uploading = true;
            this.filelist[filenum].uploading = true;
            this.uploadspertime++;                                                                                                                                   
            this.html5send(subcontainer, this.filelist[filenum].id, f, 0, filenum, false);                                                                                                                 
          }
                    
        }
        
        filenum++;
        
      }
                              
    }.bind(this));
                        
  },
  
  html5send: function(subcontainer, file_id, file, start, filenum, resume) {
    
    // Prepare request
    //var xhr = Browser.Request();
            
    var end = this.options.blocksize,
        action = this.options.action, 
        chunk;
    
    var total = start + end;
    
    //console.log(start+' + '+end+' = '+total);
    
		/*          
    if (resume)          
      action += (action.contains('?') ? '&' : '?') + 'resume=1';
    */
                
    if (total > file.size)        
      end = total - file.size;                
                      
    
    // Get slice method
    if (Browser.firefox)     // For Mozilla 4.0+
      chunk = file.mozSlice(start, total);
    else if (Browser.chrome) // For Chrome and Safari
      chunk = file.webkitSlice(start, total);
    else                     // For Opera and standard browsers
      chunk = file.slice(start, total);
        
            
    var xhr = new Request({
      url: action,
      urlEncoded: false,
      noCache: true,                        
      headers: {
        'Cache-Control': 'no-cache',
        'X-Requested-With': 'XMLHttpRequest',
        'X-File-Name': file.name,
        'X-File-Size': file.size,
        'X-File-Id': file_id,
				'X-File-Resume': resume   
      },  
      onSuccess: function(response) 
      {        
        response = JSON.decode(response);
        
        if (this.options.listview)
            var respcontainer = document.id(subcontainer.get('id')+'_file_'+(filenum + 1));                        
                  
        if (response.error == 0)
        {          
                              
          if (total < file.size) 
          {                                    
            
            if (this.options.listview)
            {
              var percent = (total / file.size) * 100;
              respcontainer.set('html', percent.ceil()+'%');
            }
            
            this.html5send(subcontainer, file_id, file, start + response.size.toInt(), filenum, true)  // Recursive upload                        
          }       
          else
          {
            if (this.options.listview)
            {
              respcontainer.addClass('mooupload_noerror');
              respcontainer.set('html', this.options.texts.uploaded);
            }
                                   
            this.uploadspertime--;                                     						
						
						this.filelist[filenum].uploaded = true;
						this.progressStep(document.id(subcontainer.get('id')+'_progresscont'));
            
            this.fireEvent('onFileUpload', [filenum]);
            
            if (this.uploadspertime <= this.options.maxuploadspertime)
              this.html5Upload(subcontainer);
                        
          }
        }
        else
        {                    
          
          if (this.options.listview)
          {
            respcontainer.addClass('mooupload_error');
            respcontainer.set('html', this.options.texts.error);
          }
          
          this.uploadspertime--;                                     						
						
					this.filelist[filenum].uploaded = true;
					this.progressStep(document.id(subcontainer.get('id')+'_progresscont'));
          
          this.fireEvent('onFileUpload', [filenum]);
          
          this.fireEvent('onFileUploadError', [filenum, response]);
          
          if (this.uploadspertime <= this.options.maxuploadspertime)
            this.html5Upload(subcontainer);
						                    
        }                 				
                
      }.bind(this)    
    }); 
    
    xhr.sendBlob(chunk);
                                        
  },
  
  html5Delete: function(fileindex)
  {
  },
  
  // ------------------------- Specific methods for html4 ---------------------
  
  /*
	Function: html4
		Private method

		Specific method for html4
	*/
  html4: function (subcontainer) {
  
    var subcontainer_id = subcontainer.get('id');
    
    // Setup some options
    this.options.multiple = false;
    
    var iframe = new IFrame({
      id: subcontainer_id+'_frmFile',
      name: subcontainer_id+'_frmFile',
      
      styles: {
        display: 'none'
      },
      
      events: {
        load: function() {
          
          var response = iframe.contentWindow.document.body.innerHTML;
          
          if (response != '')
          {
            this.uploading = false;
                    
            this.html4Upload(subcontainer);
            
            response = JSON.decode(response);
                    
            if (this.options.listview)
              var respcontainer = document.id(subcontainer_id+'_file_'+(response.key + 1));
                    
            //console.log(respcontainer);
            if (response.error > 0)   
            {
              if (this.options.listview)
              {
                respcontainer.addClass('mooupload_error');     
                respcontainer.set('html', this.options.texts.error);
              }
              
              this.fireEvent('onFileUploadError', [response.key, response]);
            }
            else
            {
              
              this.filelist[response.key].uploaded = true;
              
							// Complete file information from server side
              this.filelist[response.key].size = response.size;
              
							if (this.options.listview)
              {
                respcontainer.addClass('mooupload_noerror');
                respcontainer.set('html', this.options.texts.uploaded);
                
                respcontainer.getPrevious('.filesize').set('html', response.size + ' bytes');
              }                                          
                      
            }
            
            this.progressStep(document.id(subcontainer.get('id')+'_progresscont'));
                                                                                             
            this.fireEvent('onFileUpload', [response.key]);            
                    
          }
                    
        }.bind(this)
      }
            
    }).inject(subcontainer);
    
    
              
    this.baseHtml(subcontainer);
    
    // Trigger for html file input
    this.htmlAddFile(subcontainer); 
                
  },
  
  html4Upload: function(subcontainer)
  {                
    
    var filenum = 0;
             
    if (!this.uploading)
    {
    
      this.getForms(subcontainer).each(function(el) {
                                    
        var file = this.filelist[filenum];
                        
        if (file != undefined && !this.uploading)
        {        
          if (file.checked && !file.uploading)
          {               
            file.uploading = true;
            this.uploading = true;
            var submit = el.submit();                                              
          }                                        
        }
        
        filenum++;
                                      
      }.bind(this));
      
    }
          
  },
  
  html4Delete: function(fileindex)
  {
  },
     
  getInputFileName: function(element)
  {        
    var pieces = element.get('value').split(/(\\|\/)/g);
       
    return pieces[pieces.length-1];
  }
      
});

