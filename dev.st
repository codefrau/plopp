"Execute these in a workspace of a regular Squeak image running in SqueakJS on the same host. The file system is shared between all pages"

"For development, we want to delete all log files and replace all png files with a 1x1 transparent image for faster loading."

f := Form extent: 1@1 depth: 32.
(FileDirectory on: 'Plopp/user') fullNamesOfAllFilesInSubtree do: [:p |
    ('*.log' match: p) ifTrue: [Transcript show: 'deleting ', p; cr. FileDirectory deleteFilePath: p].
    ('*.png' match: p) ifTrue: [
    Transcript show: 'replacing ', p; cr.
    FileDirectory deleteFilePath: p.
    PNGReadWriter putForm: f onFileNamed: p.]].

"To restore the files, we only need to delete them. The next time the application is started, the files will be recreated from UserData.zip."

(FileDirectory on: 'Plopp/user') fullNamesOfAllFilesInSubtree do: [:p |
    Transcript show: 'deleting ', p; cr. FileDirectory deleteFilePath: p].
