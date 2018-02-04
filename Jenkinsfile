//This pipeline assumes the following plugins exist on the Jenkins instance:
//TBD

pipeline {
	agent any

	stages {
		stage('Deploy') {
			steps{
				sh('rm -f package.zip')
				sh('zip -j package.zip -r lambda/node_modules')
				sh('zip -j package.zip lambda/index.js')
				sh('/root/.local/bin/aws lambda update-function-code --function-name GetWhitepapers-DEV --zip-file fileb://package.zip')
				sh('rm -f package.zip')
				sh('rm -rf lambda/node_modules')
				sh('rm -f package-lock.json')
			}
		}
	}
}