$body = @{
    title = "Test Ticket"
    description = "This is a test ticket"
    tag_names = @("bug", "urgent")
} | ConvertTo-Json

Write-Host "Creating ticket..."
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/tickets" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
Write-Host $response.Content
Write-Host ""

Write-Host "Getting all tickets..."
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/tickets" -Method GET -UseBasicParsing
Write-Host $response.Content
Write-Host ""

Write-Host "Getting all tags..."
$response = Invoke-WebRequest -Uri "http://localhost:8000/api/tags" -Method GET -UseBasicParsing
Write-Host $response.Content
