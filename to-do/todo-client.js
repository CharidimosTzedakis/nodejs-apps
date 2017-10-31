function deleteItem () {

  var item = $("#inputText").val();
  console.log(1);
  if (item !='') {
      console.log(2);
      $.ajax({
          method: "DELETE",
          url: "localhost:3000",
          data: item,
          success: function(msg){
              alert("Data Deleted: " + msg);
          }
      });
  }
}
