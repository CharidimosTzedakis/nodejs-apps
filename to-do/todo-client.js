function deleteItem () {

  var item = $("#inputText").val();
  if (item !='')
      $.ajax({
          type: "DELETE",
          url: "localhost:3000",
          data: item,
          success: function(msg){
              alert("Data Deleted: " + msg);
          }
      });

}
