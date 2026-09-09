package storetest

import (
	"errors"
	"fmt"
	"testing"

	"github.com/go-sql-driver/mysql"
)

func TestIsCreateDatabaseDenied(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "mysql 1044",
			err:  &mysql.MySQLError{Number: 1044, Message: "Access denied for user 'insight'@'%' to database 'insight_test_1'"},
			want: true,
		},
		{
			name: "wrapped 1044",
			err:  fmt.Errorf("create: %w", &mysql.MySQLError{Number: 1044, Message: "Access denied"}),
			want: true,
		},
		{
			name: "string 1044",
			err:  errors.New("Error 1044 (42000): Access denied for user 'insight'@'localhost' to database 'x'"),
			want: true,
		},
		{
			name: "unknown database 1049",
			err:  &mysql.MySQLError{Number: 1049, Message: "Unknown database 'insight_test'"},
			want: false,
		},
		{
			name: "other error",
			err:  errors.New("connection refused"),
			want: false,
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := isCreateDatabaseDenied(tc.err); got != tc.want {
				t.Fatalf("isCreateDatabaseDenied(%v) = %v, want %v", tc.err, got, tc.want)
			}
		})
	}
}

func TestIsUnknownDatabase(t *testing.T) {
	t.Parallel()
	err := &mysql.MySQLError{Number: 1049, Message: "Unknown database 'insight_test'"}
	if !isUnknownDatabase(err) {
		t.Fatal("expected 1049 to be unknown database")
	}
	if isUnknownDatabase(&mysql.MySQLError{Number: 1044, Message: "Access denied"}) {
		t.Fatal("1044 is not unknown database")
	}
}
