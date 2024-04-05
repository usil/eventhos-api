#!/bin/bash

echo "Parameters"
for ARGUMENT in "$@"
do
    if [[ -z "${ARGUMENT// }" ]]
    then
      continue;
    fi

    KEY=$(echo $ARGUMENT | cut -f1 -d=)
    KEY_LENGTH=${#KEY}
    VALUE="${ARGUMENT:$KEY_LENGTH+1}"
    export "$KEY"="$VALUE"
    echo "$KEY"=$VALUE
done

function import_db { 
  echo	
  echo "starting import..."
  mysql -u $user -p $database_name < $file_to_import
}


function export_db {
  echo
  echo "starting export..."
  now=$(date '+%Y-%m-%d_%H-%M-%S')
  file_to_export=$HOME/$database_name-$now.sql
  mysqldump -u $user -p $database_name > $file_to_export
  sed -n 1,10p  $file_to_export
  echo ""
  echo ""
  echo "run this from host to get the file"
  filename=$(basename -- "$file_to_export")
  extension="${filename##*.}"
  filename="${filename%.*}"
  container_id=$(cat /etc/hostname)
  echo "docker cp $container_id:$file_to_export /tmp/$filename.$extension"
}

function clear_db {
  echo
  echo "starting back up"
  now=$(date '+%Y-%m-%d_%H-%M-%S')
  file_to_export=$HOME/$database_name-$now.sql
  export_db
  echo
  echo
  echo "starting tables deletion..."  
  drop_script=$HOME/drop_all_tables-$now.sql
  echo "SET FOREIGN_KEY_CHECKS = 0;" > $drop_script
  ( mysqldump --add-drop-table --no-data -u $user -p $database_name | grep 'DROP TABLE' ) >> $drop_script
  echo "SET FOREIGN_KEY_CHECKS = 1;" >> $drop_script

  echo
  cat $drop_script
  echo
  echo
  mysql -u $user -p $database_name < $drop_script

}

function truncate_tables {
  echo
  echo "starting back up"
  now=$(date '+%Y-%m-%d_%H-%M-%S')
  file_to_export=$HOME/$database_name-$now.sql
  export_db
  echo
  echo
  echo "starting truncate tables..."  
  truncate_tables_script=$HOME/truncate_tables-$now.sql
  echo "SET FOREIGN_KEY_CHECKS = 0;" > $truncate_tables_script
  ( mysqldump --add-drop-table --no-data -u $user -p $database_name | grep ^DROP | sed -e 's/DROP TABLE IF EXISTS/TRUNCATE TABLE/g') >> $truncate_tables_script
  echo "SET FOREIGN_KEY_CHECKS = 1;" >> $truncate_tables_script

  echo
  cat $truncate_tables_script
  echo
  echo
  mysql -u $user -p $database_name < $truncate_tables_script

}

function create_user_and_db {
  echo
  now=$(date '+%Y-%m-%d_%H-%M-%S')
  script_file=$HOME/$script_file-$now.sql  
  echo "creating db"
  echo "CREATE DATABASE $database_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"> $script_file
  echo "CREATE USER '$new_user_name'@'%' IDENTIFIED BY '$new_user_password';">> $script_file
  echo "GRANT SELECT,INSERT,CREATE,ALTER,DROP,LOCK TABLES,CREATE TEMPORARY TABLES, DELETE,UPDATE,EXECUTE ON $database_name.* TO '$new_user_name'@'%';">> $script_file
  mysql -u $admin_user -p < $script_file
}


case $operation in

  create_user_and_db)
    create_user_and_db
    ;;

  import_db)
    import_db
    ;;

  export_db)
    export_db
    ;;

  clear_db)
    clear_db
    ;;

  truncate_tables)
    truncate_tables
    ;;

  *)
    echo "operation is not supported: $operation"
    ;;
esac