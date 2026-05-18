$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$serverPort = 8787
$webPort = 3000
$webHost = "127.0.0.1"
$webUrl = "http://${webHost}:$webPort"

function Write-Section($message) {
  Write-Host ""
  Write-Host "============================================================"
  Write-Host " $message"
  Write-Host "============================================================"
}

function Test-Command($name) {
  return $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

function Get-ListeningProcessId($port) {
  $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1

  if ($null -eq $connection) {
    return $null
  }

  return $connection.OwningProcess
}

function Wait-HttpReady($url, $timeoutSeconds, [string[]]$expectedContent = @()) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
        if ($expectedContent.Count -eq 0) {
          return $true
        }

        $body = [string]$response.Content
        foreach ($fragment in $expectedContent) {
          if ($body.Contains($fragment)) {
            return $true
          }
        }
      }
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }

  return $false
}

function Test-OnlineServerHandshake($url) {
  $socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $cts = [System.Threading.CancellationTokenSource]::new([TimeSpan]::FromSeconds(3))

  try {
    $socket.ConnectAsync([Uri]$url, $cts.Token).GetAwaiter().GetResult()

    $probe = '{"protocolVersion":1,"type":"room:heartbeat","payload":{}}'
    $probeBytes = [System.Text.Encoding]::UTF8.GetBytes($probe)
    $sendBuffer = [System.ArraySegment[byte]]::new($probeBytes)
    $socket.SendAsync(
      $sendBuffer,
      [System.Net.WebSockets.WebSocketMessageType]::Text,
      $true,
      $cts.Token
    ).GetAwaiter().GetResult()

    $buffer = New-Object byte[] 4096
    $message = New-Object System.Text.StringBuilder

    do {
      $result = $socket.ReceiveAsync([System.ArraySegment[byte]]::new($buffer), $cts.Token).GetAwaiter().GetResult()
      if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
        break
      }
      [void]$message.Append([System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count))
    } while (-not $result.EndOfMessage)

    if ($message.Length -eq 0) {
      return $false
    }

    $payload = $message.ToString() | ConvertFrom-Json
    return $payload.protocolVersion -eq 1 -and @('room:error', 'room:heartbeat') -contains $payload.type
  } catch {
    return $false
  } finally {
    if ($socket.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
      $socket.CloseAsync(
        [System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure,
        'launcher-probe',
        [System.Threading.CancellationToken]::None
      ).GetAwaiter().GetResult()
    }
    $socket.Dispose()
    $cts.Dispose()
  }
}

function Wait-OnlineServerReady($url, $timeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($timeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-OnlineServerHandshake $url) {
      return $true
    }
    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Start-DevProcess($title, $command) {
  Start-Process -FilePath "cmd.exe" -ArgumentList "/k", "title $title && cd /d `"$root`" && $command" -WorkingDirectory $root | Out-Null
}

Write-Section "Idle Collective Online Launcher"
Set-Location $root

if (-not (Test-Command "node")) {
  throw "Node.js was not found. Install Node.js first: https://nodejs.org/"
}

if (-not (Test-Command "npm")) {
  throw "npm was not found. Reinstall Node.js or fix PATH."
}

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  Write-Host "Installing dependencies..."
  npm install
}

$serverPid = Get-ListeningProcessId $serverPort
if ($null -eq $serverPid) {
  Write-Host "Starting online server on ws://localhost:$serverPort ..."
  Start-DevProcess "Idle Collective - Online Server" "npm run dev:server"
  if (-not (Wait-OnlineServerReady "ws://127.0.0.1:$serverPort" 20)) {
    throw "Online server did not become ready on port $serverPort, or the process on that port is not Idle Collective."
  }
} else {
  if (-not (Wait-OnlineServerReady "ws://127.0.0.1:$serverPort" 5)) {
    throw "Port $serverPort is occupied by PID $serverPid, but it is not responding like the Idle Collective online server."
  }
  Write-Host "Online server already running on port $serverPort. PID: $serverPid"
}

$webPid = Get-ListeningProcessId $webPort
if ($null -eq $webPid) {
  Write-Host "Starting Vite on $webUrl ..."
  Start-DevProcess "Idle Collective - Vite" "npm run dev -- --host $webHost --port $webPort"
  if (-not (Wait-HttpReady $webUrl 30 @('Idle Collective', '/@vite/client'))) {
    throw "Vite did not become ready on port $webPort, or the page on that port is not this project."
  }
} else {
  if (-not (Wait-HttpReady $webUrl 30 @('Idle Collective', '/@vite/client'))) {
    throw "Port $webPort is occupied by PID $webPid, but it is not serving the Idle Collective dev app."
  }
  Write-Host "Vite already running on port $webPort. PID: $webPid"
}

Write-Host "Starting Electron client..."
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$root`" && set IDLE_COLLECTIVE_DEV_URL=$webUrl&& npm start" -WorkingDirectory $root | Out-Null

Write-Host ""
Write-Host "Ready:"
Write-Host "  Web:    $webUrl"
Write-Host "  Online: ws://localhost:$serverPort"
Write-Host ""
