<?php
     $host = 'dbsalaoeliane.mysql.dbaas.com.br'; // COLOQUE SEU HOST AQUI
     $user = 'dbsalaoeliane';                   // COLOQUE SEU USUARIO AQUI
     $pass = '';                  // COLOQUE SUA SENHA AQUI
     $db   = 'dbsalaoeliane';                   // COLOQUE SEU BANCO AQUI
    
     $conn = new mysqli($host, $user, $pass, $db);
    
     if ($conn->connect_error) {
        die("Falha na conexão: " . $conn->connect_error);
    } 
    echo "Conectado com sucesso ao MySQL da Locaweb!";
    ?>