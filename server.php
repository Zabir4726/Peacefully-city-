<?php

$ip = "103.195.188.92";
$port = 7039;

header('Content-Type: application/json');

function QuerySAMP($ip, $port)
{
    $socket = @fsockopen("udp://".$ip, $port, $errno, $errstr, 1);

    if(!$socket) {
        return false;
    }

    stream_set_timeout($socket, 1);

    $packet = "SAMP";

    $ipParts = explode('.', $ip);

    foreach($ipParts as $part)
    {
        $packet .= chr($part);
    }

    $packet .= chr($port & 0xFF);
    $packet .= chr(($port >> 8) & 0xFF);

    $packet .= "i";

    fwrite($socket, $packet);

    $response = fread($socket, 2048);

    fclose($socket);

    return $response;
}

$response = QuerySAMP($ip, $port);

if(!$response)
{
    echo json_encode([
        "online" => false
    ]);

    exit;
}

$offset = 11;

$password = ord($response[$offset]);
$offset++;

$players = ord($response[$offset]) | (ord($response[$offset + 1]) << 8);
$offset += 2;

$maxplayers = ord($response[$offset]) | (ord($response[$offset + 1]) << 8);
$offset += 2;

$hostnameLength = ord($response[$offset]) | (ord($response[$offset + 1]) << 8);
$offset += 4;

$hostname = substr($response, $offset, $hostnameLength);

echo json_encode([
    "online" => true,
    "players" => $players,
    "maxplayers" => $maxplayers,
    "hostname" => $hostname
]);

?>