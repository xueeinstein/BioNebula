var reader = new FileReader();
function readText(that){
     if(that.files && that.files[0]){
     	var reader = new FileReader();
        reader.onload = function (e) {
             var output=e.target.result;
             document.getElementById('mySavedModel').value= output;
        };
       	reader.readAsText(that.files[0]);
      }
 }
