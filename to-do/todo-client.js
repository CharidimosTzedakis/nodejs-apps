function deleteItem () {

  var item = $("#inputText").val();
  console.log(1);
  if (item !='') {
      console.log(2);
      $.ajax({
          method: "DELETE",
          url: "http://localhost:3000",
          data: item,
          success: function(msg){
            //set innerHTML of the <html> element (documentElement)
            document.documentElement.innerHTML = msg;
          }
      });
  }
}
