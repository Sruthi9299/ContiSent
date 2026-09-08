$env:Path += ";C:\minikube"

Write-Host "Starting Minikube (Make sure Docker is open!)..." -ForegroundColor Green
minikube start

Write-Host "Starting Backend Service..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "minikube" -ArgumentList "service", "contisent-backend-service"
Start-Sleep -Seconds 5

$url = minikube service contisent-backend-service --url
$port = $url.Split(":")[-1]

Write-Host "Connecting to the public internet..." -ForegroundColor Green
Write-Host "COPY THE LINK BELOW AND PUT IT IN VERCEL!" -ForegroundColor Yellow
# Run ngrok to expose the local port
ngrok http $port