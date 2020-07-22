$( document ).ready(function() {
    var selectedCountry ;
    $("#file").on('change', function(e) {
        $('.myButton').show();
     });

    $(".myButton").on('click', function(e) {
        e.preventDefault();
        $("#loader").show();
        $.ajax({
            type: 'post',
            url: '/',
            data: {'id_spreadsheet':$("#file").children("option:selected"). val()},
            dataType: 'text',
            success : function(res, statut){ 
                $("#loader").hide();
                response = res.toString();
                console.log(response);
                if(response==="ok"){
                    alert("Operation success !");
                }else{
                    alert("Technical Error occure while reach API . Please Try to logout then login again !");
                }
            }
        })   
    });

});