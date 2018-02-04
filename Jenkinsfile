//This pipeline assumes the following plugins exist on the Jenkins instance:
//TBD

pipeline {
	agent any

	stages {
		stage('Deploy') {
			steps{
				dir('lambda')
				sh('rm -f package.zip')
				sh('npm install')
				sh('zip -j package.zip -r node_modules')
				sh('zip -j package.zip index.js')
				sh('/root/.local/bin/aws lambda update-function-code --function-name GetWhitepapers-DEV --zip-file fileb://package.zip')
				sh('rm -f package.zip')
				sh('rm -rf node_modules')
				sh('rm -f package-lock.json')
			}
		}
	}
}