function deleteItem () {

  $.ajax({
      type: "DELETE",
      url: "localhost:3000",
      data: "name=someValue",
      success: function(msg){
          alert("Data Deleted: " + msg);
      }
  });


}
