$ErrorActionPreference = "Stop"

Write-Host "========================================="
Write-Host "    Automated ASL Training Pipeline      "
Write-Host "========================================="

$PYTHON = ".\asl_env\Scripts\python.exe"

Write-Host "`n[1/4] Cleaning up old data..."
Remove-Item -Recurse -Force dataset -ErrorAction SilentlyContinue
Remove-Item -Force X.npy, y.npy, asl_model.h5 -ErrorAction SilentlyContinue
Write-Host "Clean up complete."

Write-Host "`n[2/4] Organizing WLASL Dataset..."
& $PYTHON organize_wlasl.py
if ($LASTEXITCODE -ne 0) { Write-Error "organize_wlasl.py failed!"; exit $LASTEXITCODE }

Write-Host "`n[3/4] Extracting Landmarks (This will take a long time)..."
& $PYTHON extract_optimized.py
if ($LASTEXITCODE -ne 0) { Write-Error "extract_optimized.py failed!"; exit $LASTEXITCODE }

Write-Host "`n[4/4] Training the Model..."
& $PYTHON train_model.py
if ($LASTEXITCODE -ne 0) { Write-Error "train_model.py failed!"; exit $LASTEXITCODE }

Write-Host "`n========================================="
Write-Host "🎉 Pipeline Finished Successfully! 🎉"
Write-Host "========================================="
